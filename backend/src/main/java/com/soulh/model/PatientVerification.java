package com.soulh.model;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;


@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@org.springframework.data.mongodb.core.mapping.Document
public class PatientVerification {

    @org.springframework.data.annotation.Id
    
    private String id;

    
    
    private User patient;

    
    private String proofUrl;

    
    
    @Builder.Default
    private VerificationStatus status = VerificationStatus.PENDING;

    
    private LocalDateTime createdAt;

    
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
