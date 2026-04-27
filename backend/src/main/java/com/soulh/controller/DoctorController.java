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

@RestController
@RequestMapping("/api/doctor")
@CrossOrigin
@RequiredArgsConstructor
public class DoctorController {

    private final DoctorVerificationService verificationService;
    private final UserService userService;
    private final FileStorageService fileStorageService;
    private final DoctorVerificationRepository doctorVerificationRepository;

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

    @GetMapping("/dashboard-stats")
    public ResponseEntity<Map<String, Long>> getDashboardStats() {
        long totalPatients = userRepository.countByRole(com.soulh.model.Role.USER);
        long pendingRequests = patientVerificationRepository.countByStatus(com.soulh.model.VerificationStatus.PENDING);
        long approvedUsers = userRepository.countByRoleAndIsVerifiedTrue(com.soulh.model.Role.USER);

        return ResponseEntity.ok(Map.of(
            "totalPatients", totalPatients,
            "pendingRequests", pendingRequests,
            "approvedUsers", approvedUsers
        ));
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
        return ResponseEntity.ok(Map.of(
            "id",             doctor.getId(),
            "name",           doctor.getName() != null ? doctor.getName() : "",
            "email",          doctor.getEmail() != null ? doctor.getEmail() : "",
            "specialization", doctor.getIllnessCondition() != null ? doctor.getIllnessCondition() : "",
            "experience",     doctor.getExperience() != null ? doctor.getExperience() : 0,
            "qualification",  doctor.getQualification() != null ? doctor.getQualification() : "",
            "hospital",       doctor.getHospital() != null ? doctor.getHospital() : "",
            "isVerified",     doctor.isVerified()
        ));
    }

    /** PUT /api/doctor/profile/update — lets doctor edit their own profile */
    @PutMapping("/profile/update")
    public ResponseEntity<?> updateDoctorProfile(
            @AuthenticationPrincipal UserDetails ud,
            @RequestBody Map<String, String> body) {
        userService.updateDoctorProfile(ud.getUsername(), body);
        return ResponseEntity.ok(Map.of("message", "Profile updated successfully"));
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
