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
public class Comment {

    @org.springframework.data.annotation.Id
    
    private String id;

    
    private String postId;

    
    
    private User author;

    
    private String content;

    
    private LocalDateTime createdAt;

    
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
