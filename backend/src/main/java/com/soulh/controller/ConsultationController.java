package com.soulh.controller;

import com.soulh.model.*;
import com.soulh.repository.*;
import com.soulh.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@CrossOrigin
@RequiredArgsConstructor
@Slf4j
public class ConsultationController {

    private final UserService userService;
    private final UserRepository userRepository;
    private final AvailabilitySlotRepository slotRepository;
    private final ConsultationRepository consultationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Value("${app.razorpay.key-id:rzp_test_demo}")
    private String razorpayKeyId;

    @Value("${app.razorpay.key-secret:demo_secret}")
    private String razorpaySecret;

    @Value("${app.razorpay.consultation-fee:499.0}")
    private double consultationFee;

    // ─── 1. Browse Verified Doctors ──────────────────────────────────────────────

    @GetMapping("/doctors/verified")
    public ResponseEntity<?> getVerifiedDoctors() {
        List<User> doctors = userRepository.findByRoleAndIsVerifiedTrue(Role.DOCTOR);
        List<Map<String, Object>> result = doctors.stream().map(d -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", d.getId());
            m.put("name", d.getName());
            m.put("specialization", d.getIllnessCondition() != null ? d.getIllnessCondition() : "");
            m.put("experience", d.getExperience() != null ? d.getExperience() : 0);
            m.put("qualification", d.getQualification() != null ? d.getQualification() : "");
            m.put("hospital", d.getHospital() != null ? d.getHospital() : "");
            m.put("isVerified", d.isVerified());
            m.put("fee", consultationFee);
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/doctors/{id}")
    public ResponseEntity<?> getDoctorById(@PathVariable String id) {
        User d = userService.getById(id);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", d.getId());
        m.put("name", d.getName());
        m.put("specialization", d.getIllnessCondition() != null ? d.getIllnessCondition() : "");
        m.put("experience", d.getExperience() != null ? d.getExperience() : 0);
        m.put("qualification", d.getQualification() != null ? d.getQualification() : "");
        m.put("hospital", d.getHospital() != null ? d.getHospital() : "");
        m.put("isVerified", d.isVerified());
        m.put("fee", consultationFee);
        return ResponseEntity.ok(m);
    }

    // ─── 2. Availability Slots ────────────────────────────────────────────────────

    /** Doctor creates available slots */
    @PostMapping("/availability")
    public ResponseEntity<?> createSlot(
            @AuthenticationPrincipal UserDetails ud,
            @RequestBody Map<String, String> body) {
        User doctor = userService.getByEmail(ud.getUsername());
        if (doctor.getRole() != Role.DOCTOR)
            return ResponseEntity.badRequest().body(Map.of("message", "Only doctors can create slots"));

        LocalDateTime start = LocalDateTime.parse(body.get("startTime"));
        LocalDateTime end = LocalDateTime.parse(body.get("endTime"));

        AvailabilitySlot slot = AvailabilitySlot.builder()
                .doctorId(doctor.getId())
                .startTime(start)
                .endTime(end)
                .createdAt(LocalDateTime.now())
                .build();
        slotRepository.save(slot);
        return ResponseEntity.ok(Map.of("message", "Slot created", "slotId", slot.getId()));
    }

    /** Get a doctor's available (unbooked) slots */
    @GetMapping("/availability/{doctorId}")
    public ResponseEntity<?> getAvailableSlots(@PathVariable String doctorId) {
        List<AvailabilitySlot> slots = slotRepository
                .findByDoctorIdAndIsBookedFalseAndStartTimeAfter(doctorId, LocalDateTime.now());
        return ResponseEntity.ok(slots);
    }

    /** Doctor's own slots (all) */
    @GetMapping("/availability/mine")
    public ResponseEntity<?> getMySlots(@AuthenticationPrincipal UserDetails ud) {
        User doctor = userService.getByEmail(ud.getUsername());
        return ResponseEntity.ok(slotRepository.findByDoctorId(doctor.getId()));
    }

    /** Delete a slot */
    @DeleteMapping("/availability/{slotId}")
    public ResponseEntity<?> deleteSlot(@PathVariable String slotId,
            @AuthenticationPrincipal UserDetails ud) {
        AvailabilitySlot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new RuntimeException("Slot not found"));
        User doctor = userService.getByEmail(ud.getUsername());
        if (!slot.getDoctorId().equals(doctor.getId()))
            return ResponseEntity.status(403).body(Map.of("message", "Forbidden"));
        slotRepository.delete(slot);
        return ResponseEntity.ok(Map.of("message", "Slot deleted"));
    }

    // ─── 3. Payment — Create Razorpay Order ──────────────────────────────────────

    @PostMapping("/payment/create-order")
    public ResponseEntity<?> createPaymentOrder(
            @AuthenticationPrincipal UserDetails ud,
            @RequestBody Map<String, String> body) {
        try {
            // For demo without real Razorpay keys, generate a mock order ID
            String mockOrderId = "order_demo_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
            log.info("Payment order created (demo): {}", mockOrderId);
            return ResponseEntity.ok(Map.of(
                "orderId",      mockOrderId,
                "amount",       (long)(consultationFee * 100), // Razorpay uses paise
                "currency",     "INR",
                "keyId",        razorpayKeyId,
                "description",  "SoulH Consultation"
            ));
        } catch (Exception e) {
            log.error("Payment order creation failed", e);
            return ResponseEntity.internalServerError().body(Map.of("message", "Payment service unavailable"));
        }
    }

    // ─── 4. Book Consultation ────────────────────────────────────────────────────

    @PostMapping("/consultations/book")
    public ResponseEntity<?> bookConsultation(
            @AuthenticationPrincipal UserDetails ud,
            @RequestBody Map<String, String> body) {
        User patient = userService.getByEmail(ud.getUsername());
        String slotId = body.get("slotId");
        String doctorId = body.get("doctorId");
        String razorpayPaymentId = body.get("razorpayPaymentId");
        String razorpayOrderId = body.get("razorpayOrderId");

        AvailabilitySlot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new RuntimeException("Slot not found"));

        if (slot.isBooked())
            return ResponseEntity.badRequest().body(Map.of("message", "Slot already booked"));

        // Mark slot as booked
        slot.setBooked(true);
        slotRepository.save(slot);

        // Generate Jitsi room URL (no API key needed — free!)
        String consultationId = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        String meetingUrl = "https://meet.jit.si/soulh-" + consultationId;

        Consultation consultation = Consultation.builder()
                .patientId(patient.getId())
                .doctorId(doctorId)
                .slotId(slotId)
                .status("CONFIRMED")
                .meetingUrl(meetingUrl)
                .razorpayOrderId(razorpayOrderId)
                .razorpayPaymentId(razorpayPaymentId)
                .amountPaid(consultationFee)
                .scheduledAt(slot.getStartTime())
                .createdAt(LocalDateTime.now())
                .build();
        consultationRepository.save(consultation);

        // Notify doctor via WebSocket
        messagingTemplate.convertAndSendToUser(doctorId, "/queue/notifications",
            Map.of("type", "NEW_CONSULTATION",
                   "message", "New consultation booked by " + patient.getName(),
                   "consultationId", consultation.getId()));

        // Notify patient
        messagingTemplate.convertAndSendToUser(patient.getId(), "/queue/notifications",
            Map.of("type", "CONSULTATION_CONFIRMED",
                   "message", "Your consultation is confirmed! Join at: " + meetingUrl,
                   "consultationId", consultation.getId()));

        return ResponseEntity.ok(Map.of(
            "message",      "Consultation confirmed!",
            "meetingUrl",   meetingUrl,
            "scheduledAt",  slot.getStartTime().toString(),
            "consultationId", consultation.getId()
        ));
    }

    // ─── 5. List Consultations ────────────────────────────────────────────────────

    @GetMapping("/consultations/my")
    public ResponseEntity<?> getMyConsultations(@AuthenticationPrincipal UserDetails ud) {
        User user = userService.getByEmail(ud.getUsername());
        List<Consultation> consultations = user.getRole() == Role.DOCTOR
            ? consultationRepository.findByDoctorIdOrderByCreatedAtDesc(user.getId())
            : consultationRepository.findByPatientIdOrderByCreatedAtDesc(user.getId());

        // Enrich with doctor/patient names
        List<Map<String, Object>> result = consultations.stream().map(c -> {
            Map<String, Object> m = new LinkedHashMap<>(Map.of(
                "id",           c.getId(),
                "status",       c.getStatus(),
                "meetingUrl",   c.getMeetingUrl() != null ? c.getMeetingUrl() : "",
                "amountPaid",   c.getAmountPaid() != null ? c.getAmountPaid() : 0,
                "scheduledAt",  c.getScheduledAt() != null ? c.getScheduledAt().toString() : "",
                "createdAt",    c.getCreatedAt() != null ? c.getCreatedAt().toString() : ""
            ));
            if (c.getDoctorSummary() != null) m.put("doctorSummary", c.getDoctorSummary());

            // Add doctor info for patient view
            try {
                User doctor = userService.getById(c.getDoctorId());
                m.put("doctorName", doctor.getName());
                m.put("doctorSpecialization", doctor.getIllnessCondition() != null ? doctor.getIllnessCondition() : "");
            } catch (Exception ignored) {}

            // Add patient info for doctor view
            try {
                User patient = userService.getById(c.getPatientId());
                m.put("patientName", patient.getName());
                m.put("patientIllness", patient.getIllnessCondition() != null ? patient.getIllnessCondition() : "");
            } catch (Exception ignored) {}

            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // ─── 6. Cancel Consultation ───────────────────────────────────────────────────

    @PatchMapping("/consultations/{id}/cancel")
    public ResponseEntity<?> cancelConsultation(@PathVariable String id,
            @AuthenticationPrincipal UserDetails ud) {
        User user = userService.getByEmail(ud.getUsername());
        Consultation c = consultationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Consultation not found"));

        if (!c.getPatientId().equals(user.getId()) && !c.getDoctorId().equals(user.getId()))
            return ResponseEntity.status(403).body(Map.of("message", "Forbidden"));

        c.setStatus("CANCELLED");
        consultationRepository.save(c);

        // Free up the slot
        slotRepository.findById(c.getSlotId()).ifPresent(slot -> {
            slot.setBooked(false);
            slotRepository.save(slot);
        });

        return ResponseEntity.ok(Map.of("message", "Consultation cancelled"));
    }

    // ─── 7. Doctor Writes Post-Consultation Summary ───────────────────────────────

    @PutMapping("/consultations/{id}/summary")
    public ResponseEntity<?> writeSummary(@PathVariable String id,
            @AuthenticationPrincipal UserDetails ud,
            @RequestBody Map<String, String> body) {
        User doctor = userService.getByEmail(ud.getUsername());
        Consultation c = consultationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Consultation not found"));

        if (!c.getDoctorId().equals(doctor.getId()))
            return ResponseEntity.status(403).body(Map.of("message", "Only the consulting doctor can write summary"));

        c.setDoctorSummary(body.get("summary"));
        c.setStatus("COMPLETED");
        consultationRepository.save(c);

        // Notify patient that summary is ready
        messagingTemplate.convertAndSendToUser(c.getPatientId(), "/queue/notifications",
            Map.of("type", "SUMMARY_READY",
                   "message", "Your doctor has written a consultation summary. View it in My Consultations.",
                   "consultationId", id));

        return ResponseEntity.ok(Map.of("message", "Summary saved"));
    }
}
