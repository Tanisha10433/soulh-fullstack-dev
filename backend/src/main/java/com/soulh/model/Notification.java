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
public class Notification {

    @org.springframework.data.annotation.Id
    
    private String id;

    
    
    private User user;

    
    private String message;

    
    private String type; // e.g., CONNECTION_REQUEST, REQUEST_ACCEPTED, MESSAGE, VERIFICATION_UPDATE

    @Builder.Default
    private boolean isRead = false;

    
    private LocalDateTime createdAt;

    
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
