package com.soulh.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Document(collection = "posts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Post {

    @org.springframework.data.annotation.Id
    private String id;

    private String communityId;

    private String authorId;

    private String content;

    private String illnessTag; // e.g. "Anxiety", "Chronic Pain"

    private String imageUrl;
    private String fileUrl; // For PDFs/Documents
    
    private boolean isAnonymous;

    private LocalDateTime createdAt;

    @Builder.Default
    private java.util.Set<String> likeUserIds = new java.util.HashSet<>();

    public void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
