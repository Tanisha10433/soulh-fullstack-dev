package com.soulh.controller;

import com.soulh.model.Report;
import com.soulh.model.User;
import com.soulh.repository.ReportRepository;
import com.soulh.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@CrossOrigin
@RequiredArgsConstructor
public class ReportController {

    private final ReportRepository reportRepository;
    private final UserService userService;

    @PostMapping("/submit/{reportedUserId}")
    public ResponseEntity<?> submitReport(
            @PathVariable String reportedUserId,
            @AuthenticationPrincipal UserDetails ud,
            @RequestBody Map<String, String> body) {
        User reporter = userService.getByEmail(ud.getUsername());
        User reported = userService.getById(reportedUserId);
        
        Report report = Report.builder()
                .reporterId(reporter.getId())
                .reportedUserId(reported.getId())
                .reason(body.get("reason"))
                .build();
                
        return ResponseEntity.ok(reportRepository.save(report));
    }
}
