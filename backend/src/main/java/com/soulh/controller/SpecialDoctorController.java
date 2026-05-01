package com.soulh.controller;

import com.soulh.service.UserService;
import com.soulh.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Specifically requested legacy/alias endpoints for Doctor Profile.
 */
@RestController
@CrossOrigin
@RequiredArgsConstructor
public class SpecialDoctorController {

    private final UserService userService;
    private final UserRepository userRepository;

    @GetMapping("/doctor/profile")
    public ResponseEntity<?> getDoctorProfile(@AuthenticationPrincipal UserDetails ud) {
        var doctor = userService.getByEmail(ud.getUsername());
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("id",             doctor.getId());
        m.put("name",           doctor.getName());
        m.put("specialization", doctor.getIllnessCondition());
        m.put("experience",     doctor.getExperience());
        m.put("hospital",       doctor.getHospital());
        m.put("bio",            doctor.getBio());
        m.put("expertise",      doctor.getExpertiseAreas());
        m.put("awards",         doctor.getAwards());
        m.put("publications",   doctor.getPublications());
        return ResponseEntity.ok(m);
    }

    @PostMapping("/doctor/save")
    public ResponseEntity<?> saveDoctorProfile(
            @AuthenticationPrincipal UserDetails ud,
            @RequestBody Map<String, Object> body) {
        var doctor = userService.getByEmail(ud.getUsername());
        if (body.containsKey("name")) doctor.setName((String) body.get("name"));
        if (body.containsKey("specialization")) doctor.setIllnessCondition((String) body.get("specialization"));
        if (body.containsKey("experience")) {
            try { doctor.setExperience(Integer.parseInt(body.get("experience").toString())); } catch (Exception ignored) {}
        }
        if (body.containsKey("hospital")) doctor.setHospital((String) body.get("hospital"));
        if (body.containsKey("bio")) doctor.setBio((String) body.get("bio"));
        if (body.containsKey("expertise")) doctor.setExpertiseAreas((List<String>) body.get("expertise"));
        if (body.containsKey("awards")) doctor.setAwards((List<String>) body.get("awards"));
        if (body.containsKey("publications")) doctor.setPublications((List<String>) body.get("publications"));
        
        userRepository.save(doctor);
        return ResponseEntity.ok(Map.of("message", "Profile saved successfully"));
    }
}
