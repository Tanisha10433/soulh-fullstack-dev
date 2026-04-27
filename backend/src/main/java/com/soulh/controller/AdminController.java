package com.soulh.controller;

import com.soulh.model.DoctorVerification;
import com.soulh.service.DoctorVerificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin
@RequiredArgsConstructor
public class AdminController {

    private final DoctorVerificationService verificationService;
    private final com.soulh.repository.ReportRepository reportRepository;

    @PreAuthorize("hasAuthority('ADMIN')")
    @GetMapping("/pending")
    public ResponseEntity<List<DoctorVerification>> getPending() {
        return ResponseEntity.ok(verificationService.getPending());
    }

    @PreAuthorize("hasAuthority('ADMIN')")
    @GetMapping("/reports")
    public ResponseEntity<?> getPendingReports() {
        return ResponseEntity.ok(reportRepository.findByResolvedFalseOrderByCreatedAtDesc());
    }

    @PreAuthorize("hasAuthority('ADMIN')")
    @PatchMapping("/reports/{id}/resolve")
    public ResponseEntity<?> resolveReport(@PathVariable String id) {
        var report = reportRepository.findById(id).orElseThrow();
        report.setResolved(true);
        reportRepository.save(report);
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("hasAuthority('ADMIN')")
    @GetMapping("/approved")
    public ResponseEntity<List<DoctorVerification>> getApproved() {
        return ResponseEntity.ok(verificationService.getApproved());
    }

    @PreAuthorize("hasAuthority('ADMIN')")
    @PatchMapping("/verify/{id}")
    public ResponseEntity<?> updateVerification(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        boolean approve = "APPROVE".equalsIgnoreCase(body.get("action"));
        var result = approve ? verificationService.approve(id) : verificationService.reject(id);
        return ResponseEntity.ok(Map.of("status", result.getStatus().name()));
    }
}
