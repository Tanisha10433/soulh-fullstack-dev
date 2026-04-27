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
public class Report {

    @org.springframework.data.annotation.Id
    
    private String id;

    
    
    private User reporter;

    
    
    private User reportedUser;

    
    private String reason;

    @Builder.Default
    private boolean resolved = false;

    
    private LocalDateTime createdAt;

    
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
