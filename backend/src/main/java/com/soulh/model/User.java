package com.soulh.model;

import com.fasterxml.jackson.annotation.JsonIgnore;

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
public class User {

    @org.springframework.data.annotation.Id
    
    private String id;

    
    private String email;

    @JsonIgnore // NEVER return password in API responses
    
    private String password;

    
    private String name;

    
    
    private Role role;

    // Profile fields
    private String illnessCondition; // Works as specialization for doctors too
    private Integer experience;
    private String qualification;
    private String hospital;

    
    @Builder.Default
    private boolean isPublicProfile = true;

    // Fine-grained privacy settings
    @Builder.Default
    private boolean showInSearch = true;
    @Builder.Default
    private boolean showIllness = true;
    @Builder.Default
    private boolean allowDirectMessages = true;

    // OAuth / OIDC support
    private String oauthProvider;  // "google", "github", null for email
    private String oauthId;        // provider's subject ID

    // E2E encryption public key (device-generated, uploaded on first login)
    
    private String e2ePublicKey;

    // Doctor verification badge
    @Builder.Default
    private boolean isVerified = false;

    
    private LocalDateTime createdAt;

    
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
