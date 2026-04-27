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
public class Community {

    @org.springframework.data.annotation.Id
    
    private String id;

    
    private String name;

    
    private String description;

    private String illnessCondition; // To target specific conditions

    
    private LocalDateTime createdAt;

    
    
    private java.util.Set<User> members = new java.util.HashSet<>();

    
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
