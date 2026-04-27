package com.soulh.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

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
public class ConnectionRequest {

    @org.springframework.data.annotation.Id
    
    private String id;

    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    
    
    private User sender;

    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    
    
    private User receiver;

    
    
    @Builder.Default
    private RequestStatus status = RequestStatus.PENDING;

    
    private LocalDateTime createdAt;

    
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
