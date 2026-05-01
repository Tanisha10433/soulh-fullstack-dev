package com.soulh.controller;

import com.soulh.model.DoctorVerification;
import com.soulh.model.VerificationStatus;
import com.soulh.repository.DoctorVerificationRepository;
import com.soulh.service.DoctorVerificationService;
import com.soulh.service.FileStorageService;
import com.soulh.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/doctor")
@CrossOrigin
@RequiredArgsConstructor
public class DoctorController {

    private final DoctorVerificationService verificationService;
    private final UserService userService;
    private final FileStorageService fileStorageService;
    private final DoctorVerificationRepository doctorVerificationRepository;
    private final com.soulh.repository.ConsultationRequestRepository consultationRequestRepository;
    private final com.soulh.repository.ConsultationRepository consultationRepository;
    private final com.soulh.repository.DoctorContentRepository doctorContentRepository;

    /**
     * Legacy simple registration (registration number only).
     */
    @PostMapping("/verify")
    public ResponseEntity<?> submitVerification(
            @AuthenticationPrincipal UserDetails ud,
            @RequestBody Map<String, String> body) {
        var doctor = userService.getByEmail(ud.getUsername());
        return ResponseEntity.ok(verificationService.submit(doctor, body.get("registrationNumber")));
    }

    /**
     * Full KYC onboarding — accepts document uploads.
     * Called from DoctorOnboarding.jsx wizard.
     */
    @PostMapping("/apply")
    public ResponseEntity<?> applyForVerification(
            @AuthenticationPrincipal UserDetails ud,
            @RequestParam("certificate") MultipartFile certificate,
            @RequestParam("govId") MultipartFile govId,
            @RequestParam("regNumber") String regNumber,
            @RequestParam("council") String council,
            @RequestParam(value = "specialization", required = false) String specialization,
            @RequestParam(value = "experience",     required = false) String experience,
            @RequestParam(value = "hospital",       required = false) String hospital,
            @RequestParam(value = "qualification",  required = false) String qualification) {

        var doctor = userService.getByEmail(ud.getUsername());

        // Check for existing non-rejected submission
        var existing = doctorVerificationRepository.findByDoctor(doctor);
        if (existing.isPresent() && existing.get().getStatus() == VerificationStatus.PENDING) {
            return ResponseEntity.badRequest().body(Map.of("message", "A pending verification already exists."));
        }

        String certFileName  = fileStorageService.storeFile(certificate);
        String govIdFileName = fileStorageService.storeFile(govId);

        // Update doctor profile fields while we have them
        if (specialization != null) doctor.setIllnessCondition(specialization);
        if (hospital       != null) doctor.setHospital(hospital);
        if (qualification  != null) doctor.setQualification(qualification);
        if (experience     != null) {
            try { doctor.setExperience(Integer.parseInt(experience)); } catch (NumberFormatException ignored) {}
        }

        DoctorVerification v = existing.orElse(new DoctorVerification());
        v.setDoctor(doctor);
        v.setRegistrationNumber(regNumber);
        v.setCouncilName(council);
        v.setCertificateUrl("/api/files/" + certFileName);
        v.setGovernmentIdUrl("/api/files/" + govIdFileName);
        v.setStatus(VerificationStatus.PENDING);
        v.setExpiresAt(LocalDate.now().plusYears(1));
        doctorVerificationRepository.save(v);

        return ResponseEntity.accepted().body(Map.of("message", "Application submitted for review"));
    }

    @GetMapping("/status")
    public ResponseEntity<DoctorVerification> getStatus(@AuthenticationPrincipal UserDetails ud) {
        var doctor = userService.getByEmail(ud.getUsername());
        DoctorVerification v = verificationService.getVerificationForDoctor(doctor);
        if (v == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(v);
    }

    // --- PATIENT VERIFICATION (Doctor checks Patients) ---
    private final com.soulh.repository.PatientVerificationRepository patientVerificationRepository;
    private final com.soulh.repository.UserRepository userRepository;

    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboard(@AuthenticationPrincipal UserDetails ud) {
        try {
            var doctor = userService.getByEmail(ud.getUsername());
            if (doctor == null) return ResponseEntity.status(401).body(Map.of("message", "User not found"));
            
            String docId = doctor.getId();
            
            long totalPatients = 0;
            try {
                totalPatients = consultationRepository.findByDoctorId(docId).stream()
                    .map(com.soulh.model.Consultation::getPatientId)
                    .filter(Objects::nonNull)
                    .distinct()
                    .count();
            } catch (Exception e) { System.err.println("Error counting patients: " + e.getMessage()); }

            long pendingRequests = 0;
            try {
                pendingRequests = consultationRequestRepository.findByDoctorIdAndStatus(docId, "PENDING").size();
            } catch (Exception e) { System.err.println("Error counting requests: " + e.getMessage()); }

            long activeConsultations = 0;
            try {
                activeConsultations = consultationRepository.findByDoctorIdAndStatus(docId, "CONFIRMED").size();
            } catch (Exception e) { System.err.println("Error counting active: " + e.getMessage()); }

            long completedSessions = 0;
            try {
                completedSessions = consultationRepository.findByDoctorIdAndStatus(docId, "COMPLETED").size();
            } catch (Exception e) { System.err.println("Error counting completed: " + e.getMessage()); }

            return ResponseEntity.ok(Map.of(
                "totalPatients", totalPatients,
                "pendingRequests", pendingRequests,
                "activeConsultations", activeConsultations,
                "completedSessions", completedSessions
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok(Map.of(
                "totalPatients", 0L,
                "pendingRequests", 0L,
                "activeConsultations", 0L,
                "completedSessions", 0L,
                "warning", "Some data could not be synchronized."
            ));
        }
    }

    @GetMapping("/patient-verifications")
    public ResponseEntity<?> getPendingPatients() {
        return ResponseEntity.ok(patientVerificationRepository.findByStatus(com.soulh.model.VerificationStatus.PENDING));
    }

    @GetMapping("/patient-history")
    public ResponseEntity<?> getPatientHistory() {
        return ResponseEntity.ok(patientVerificationRepository.findByStatusNot(com.soulh.model.VerificationStatus.PENDING));
    }

    // ─── DOCTOR SELF-PROFILE ────────────────────────────────────────────────────

    /** GET /api/doctor/profile — returns the logged-in doctor's own profile */
    @GetMapping("/profile")
    public ResponseEntity<?> getDoctorProfile(@AuthenticationPrincipal UserDetails ud) {
        var doctor = userService.getByEmail(ud.getUsername());
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("id",             doctor.getId());
        m.put("name",           doctor.getName() != null ? doctor.getName() : "");
        m.put("email",          doctor.getEmail() != null ? doctor.getEmail() : "");
        m.put("specialization", doctor.getIllnessCondition() != null ? doctor.getIllnessCondition() : "");
        m.put("experience",     doctor.getExperience() != null ? doctor.getExperience() : 0);
        m.put("qualification",  doctor.getQualification() != null ? doctor.getQualification() : "");
        m.put("hospital",       doctor.getHospital() != null ? doctor.getHospital() : "");
        m.put("bio",            doctor.getBio() != null ? doctor.getBio() : "");
        m.put("expertiseAreas", doctor.getExpertiseAreas());
        m.put("awards",         doctor.getAwards());
        m.put("publications",   doctor.getPublications());
        m.put("isVerified",     doctor.isVerified());
        return ResponseEntity.ok(m);
    }

    /** PUT /api/doctor/profile — lets doctor edit their own profile */
    @PutMapping("/profile")
    @PostMapping("/save")
    public ResponseEntity<?> updateDoctorProfile(
            @AuthenticationPrincipal UserDetails ud,
            @RequestBody Map<String, Object> body) {
        var doctor = userService.getByEmail(ud.getUsername());
        if (body.containsKey("name")) doctor.setName((String) body.get("name"));
        if (body.containsKey("specialization")) doctor.setIllnessCondition((String) body.get("specialization"));
        if (body.containsKey("experience")) {
            try { doctor.setExperience(Integer.parseInt(body.get("experience").toString())); } catch (Exception ignored) {}
        }
        if (body.containsKey("qualification")) doctor.setQualification((String) body.get("qualification"));
        if (body.containsKey("hospital")) doctor.setHospital((String) body.get("hospital"));
        if (body.containsKey("bio")) doctor.setBio((String) body.get("bio"));
        if (body.containsKey("expertiseAreas")) doctor.setExpertiseAreas((List<String>) body.get("expertiseAreas"));
        if (body.containsKey("awards")) doctor.setAwards((List<String>) body.get("awards"));
        if (body.containsKey("publications")) doctor.setPublications((List<String>) body.get("publications"));
        
        userRepository.save(doctor);
        return ResponseEntity.ok(Map.of("message", "Profile updated successfully"));
    }

    // ─── CONSULTATION REQUESTS ──────────────────────────────────────────────────

    @GetMapping("/requests")
    public ResponseEntity<?> getConsultationRequests(@AuthenticationPrincipal UserDetails ud) {
        var doctor = userService.getByEmail(ud.getUsername());
        var requests = consultationRequestRepository.findByDoctorIdAndStatus(doctor.getId(), "PENDING");
        
        // Enrich with patient name
        List<Map<String, Object>> result = requests.stream().map(r -> {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("id", r.getId());
            m.put("patientId", r.getPatientId());
            m.put("condition", r.getCondition());
            m.put("scheduledTime", r.getScheduledTime());
            try {
                var patient = userService.getById(r.getPatientId());
                m.put("patientName", patient.getName());
            } catch (Exception e) {
                m.put("patientName", "Unknown Patient");
            }
            return m;
        }).collect(java.util.stream.Collectors.toList());
        
        return ResponseEntity.ok(result);
    }

    @PostMapping("/requests/{id}/accept")
    public ResponseEntity<?> acceptRequest(@PathVariable String id, @AuthenticationPrincipal UserDetails ud) {
        var req = consultationRequestRepository.findById(id).orElseThrow();
        req.setStatus("ACCEPTED");
        consultationRequestRepository.save(req);

        // Create a confirmed consultation
        String consultationId = java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        String meetingUrl = "https://meet.jit.si/soulh-" + consultationId;

        var consultation = com.soulh.model.Consultation.builder()
                .patientId(req.getPatientId())
                .doctorId(req.getDoctorId())
                .status("CONFIRMED")
                .meetingUrl(meetingUrl)
                .scheduledAt(req.getScheduledTime())
                .createdAt(java.time.LocalDateTime.now())
                .build();
        consultationRepository.save(consultation);

        return ResponseEntity.ok(Map.of("message", "Request accepted", "consultationId", consultation.getId()));
    }

    @PostMapping("/requests/{id}/reject")
    public ResponseEntity<?> rejectRequest(@PathVariable String id) {
        var req = consultationRequestRepository.findById(id).orElseThrow();
        req.setStatus("REJECTED");
        consultationRequestRepository.save(req);
        return ResponseEntity.ok(Map.of("message", "Request rejected"));
    }

    @GetMapping("/consultations")
    public ResponseEntity<?> getConsultations(@AuthenticationPrincipal UserDetails ud) {
        var doctor = userService.getByEmail(ud.getUsername());
        var consultations = consultationRepository.findByDoctorId(doctor.getId());
        
        List<Map<String, Object>> result = consultations.stream().map(c -> {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("id", c.getId());
            m.put("patientId", c.getPatientId());
            m.put("condition", c.getCondition());
            m.put("status", c.getStatus());
            m.put("scheduledTime", c.getScheduledAt());
            try {
                var patient = userService.getById(c.getPatientId());
                m.put("patientName", patient.getName());
            } catch (Exception e) {
                m.put("patientName", "Unknown Patient");
            }
            return m;
        }).collect(Collectors.toList());
        
        return ResponseEntity.ok(result);
    }

    @PostMapping("/consultations/{id}/complete")
    public ResponseEntity<?> completeConsultation(@PathVariable String id) {
        var consultation = consultationRepository.findById(id).orElseThrow();
        consultation.setStatus("COMPLETED");
        consultationRepository.save(consultation);
        return ResponseEntity.ok(Map.of("message", "Consultation marked as completed"));
    }

    @PostMapping("/content")
    public ResponseEntity<?> createContent(
            @AuthenticationPrincipal UserDetails ud,
            @RequestBody Map<String, String> body) {
        var doctor = userService.getByEmail(ud.getUsername());
        var content = com.soulh.model.DoctorContent.builder()
                .doctorId(doctor.getId())
                .title(body.get("title"))
                .content(body.get("content"))
                .type(body.get("type")) // ARTICLE or TIP
                .createdAt(java.time.LocalDateTime.now())
                .build();
        doctorContentRepository.save(content);
        return ResponseEntity.ok(Map.of("message", "Content added successfully"));
    }

    @GetMapping("/patients")
    public ResponseEntity<?> getConnectedPatients(@AuthenticationPrincipal UserDetails ud) {
        var doctor = userService.getByEmail(ud.getUsername());
        var patientIds = consultationRepository.findByDoctorId(doctor.getId()).stream()
                .map(com.soulh.model.Consultation::getPatientId)
                .distinct()
                .collect(java.util.stream.Collectors.toList());

        var patients = patientIds.stream().map(id -> {
            try {
                var p = userService.getById(id);
                return Map.of(
                    "id", p.getId(),
                    "name", p.getName(),
                    "condition", p.getIllnessCondition() != null ? p.getIllnessCondition() : ""
                );
            } catch (Exception e) {
                return null;
            }
        }).filter(Objects::nonNull).collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(patients);
    }

    @PatchMapping("/verify-patient/{id}")
    public ResponseEntity<?> updatePatientVerification(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        var pv = patientVerificationRepository.findById(id).orElseThrow();
        boolean approve = "APPROVE".equalsIgnoreCase(body.get("action"));
        pv.setStatus(approve ? com.soulh.model.VerificationStatus.APPROVED : com.soulh.model.VerificationStatus.REJECTED);
        patientVerificationRepository.save(pv);
        
        if (approve) {
            com.soulh.model.User patient = pv.getPatient();
            patient.setVerified(true);
            userRepository.save(patient);
        }
        return ResponseEntity.ok(Map.of("status", pv.getStatus().name()));
    }
}
