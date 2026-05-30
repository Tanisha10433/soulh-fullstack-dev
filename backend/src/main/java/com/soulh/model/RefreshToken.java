package com.soulh.model;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;


@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@org.springframework.data.mongodb.core.mapping.Document
public class RefreshToken {

    @org.springframework.data.annotation.Id
    
    private String id;

    @org.springframework.data.mongodb.core.mapping.DocumentReference
    private User user;

    
    private String token;

    
    private Instant expiryDate;
}
