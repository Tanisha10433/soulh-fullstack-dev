package com.soulh.model;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;


@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@org.springframework.data.mongodb.core.mapping.Document
public class DoctorVerification {

    @org.springframework.data.annotation.Id
    
    private String id;

    
    
    private User doctor;

    
    private String registrationNumber;

    private String councilName;      // e.g. Medical Council of India
    private String certificateUrl;   // uploaded credential doc path
    private String governmentIdUrl;  // uploaded government ID path
    private String adminNotes;
    private LocalDate expiresAt;     // annual re-verification date

    
    
    @Builder.Default
    private VerificationStatus status = VerificationStatus.PENDING;

    
    private LocalDateTime submittedAt;

    private LocalDateTime updatedAt;

    
    protected void onSubmit() {
        submittedAt = LocalDateTime.now();
    }

    
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
