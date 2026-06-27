package com.soulh.controller;

import com.soulh.dto.UserDTO;

import com.soulh.model.User;
import com.soulh.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@CrossOrigin
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<User> getCurrentUser(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(userService.getByEmail(ud.getUsername()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getUserById(@PathVariable String id) {
        User user = userService.getById(id);
        // Guarantee name is never null — fall back to email prefix
        String displayName = (user.getName() != null && !user.getName().isBlank())
                ? user.getName()
                : (user.getEmail() != null ? user.getEmail().split("@")[0] : "User");
        return ResponseEntity.ok(UserDTO.builder()
                .id(user.getId())
                .name(displayName)
                .email(user.getEmail())
                .illnessCondition(user.getIllnessCondition())
                .isVerified(user.isVerified())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .build());
    }

    @GetMapping("/search")
    public ResponseEntity<List<User>> searchByCondition(@RequestParam String condition) {
        return ResponseEntity.ok(userService.searchByCondition(condition));
    }

    @PatchMapping("/me")
    public ResponseEntity<User> updateProfile(
            @AuthenticationPrincipal UserDetails ud,
            @RequestBody Map<String, Object> body) {
        String condition = (String) body.get("illnessCondition");
        boolean isPublic = body.containsKey("publicProfile") ? (Boolean) body.get("publicProfile") : true;
        return ResponseEntity.ok(userService.updateProfile(ud.getUsername(), condition, isPublic));
    }

    private final com.soulh.repository.PatientVerificationRepository patientVerificationRepository;

    @PostMapping("/submit-proof")
    public ResponseEntity<?> submitVerificationProof(
            @AuthenticationPrincipal UserDetails ud,
            @RequestBody Map<String, String> body) {
        User patient = userService.getByEmail(ud.getUsername());
        
        // Check if pending exists
        var existing = patientVerificationRepository.findByPatient(patient);
        if (existing.isPresent() && existing.get().getStatus() == com.soulh.model.VerificationStatus.PENDING) {
            return ResponseEntity.badRequest().body("Validation already pending.");
        }
        
        com.soulh.model.PatientVerification pv = existing.orElse(new com.soulh.model.PatientVerification());
        pv.setPatient(patient);
        pv.setProofUrl(body.getOrDefault("proofUrl", "https://example.com/dummy-medical-record.pdf"));
        pv.setStatus(com.soulh.model.VerificationStatus.PENDING);
        
        return ResponseEntity.ok(patientVerificationRepository.save(pv));
    }

    private final com.soulh.repository.UserRepository userRepository;

    @GetMapping("/doctors")
    public ResponseEntity<?> getVerifiedDoctors() {
        return ResponseEntity.ok(userRepository.findByRoleAndIsVerifiedTrue(com.soulh.model.Role.DOCTOR));
    }

    @GetMapping("/discover")
    public ResponseEntity<?> discoverPeers(@AuthenticationPrincipal UserDetails ud) {
        User me = userService.getByEmail(ud.getUsername());
        return ResponseEntity.ok(userService.discoverPeers(me));
    }

    // ── Privacy Settings ────────────────────────────────────────────────
    @PatchMapping("/me/privacy")
    public ResponseEntity<?> updatePrivacy(
            @AuthenticationPrincipal UserDetails ud,
            @RequestBody Map<String, Boolean> settings) {
        return ResponseEntity.ok(userService.updatePrivacy(ud.getUsername(), settings));
    }

    // ── GDPR Account Deletion ────────────────────────────────────────────
    @DeleteMapping("/me")
    public ResponseEntity<?> deleteMyAccount(@AuthenticationPrincipal UserDetails ud) {
        userService.deleteAccount(ud.getUsername());
        return ResponseEntity.ok(Collections.singletonMap("message", "Account permanently deleted"));
    }

    // ── E2E Encryption Key Management ────────────────────────────────────
    @PostMapping("/me/public-key")
    public ResponseEntity<?> registerPublicKey(
            @AuthenticationPrincipal UserDetails ud,
            @RequestBody Map<String, String> body) {
        userService.savePublicKey(ud.getUsername(), body.get("publicKey"));
        return ResponseEntity.ok(Collections.singletonMap("message", "Public key registered"));
    }

    @GetMapping("/{id}/public-key")
    public ResponseEntity<String> getPublicKey(@PathVariable String id) {
        return ResponseEntity.ok(userService.getPublicKey(id));
    }

    @PostMapping("/{id}/block")
    public ResponseEntity<?> blockUser(@AuthenticationPrincipal UserDetails ud, @PathVariable String id) {
        userService.blockUser(ud.getUsername(), id);
        return ResponseEntity.ok(Collections.singletonMap("message", "User blocked"));
    }

    @PostMapping("/{id}/unblock")
    public ResponseEntity<?> unblockUser(@AuthenticationPrincipal UserDetails ud, @PathVariable String id) {
        userService.unblockUser(ud.getUsername(), id);
        return ResponseEntity.ok(Collections.singletonMap("message", "User unblocked"));
    }

    @PostMapping("/{id}/report")
    public ResponseEntity<?> reportUser(
            @AuthenticationPrincipal UserDetails ud,
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        userService.reportUser(ud.getUsername(), id, body.get("reason"), body.get("description"));
        return ResponseEntity.ok(Collections.singletonMap("message", "Report submitted"));
    }
}
