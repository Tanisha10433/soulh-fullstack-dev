package com.soulh.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Document(collection = "messages")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message {

    @org.springframework.data.annotation.Id
    private String id;

    @org.springframework.data.mongodb.core.index.Indexed
    private String senderId;
    @org.springframework.data.mongodb.core.index.Indexed
    private String receiverId;

    private String content;
    private String voiceUrl;

    // Mood check-in emoji (optional)
    private String mood;

    // Message status: sent → delivered → read
    @Builder.Default
    private String status = "sent";

    // E2E encryption (optional — populated when client-side encryption is active)
    private String ciphertext;
    private String nonce;

    // Anonymous mode
    @Builder.Default
    private boolean isAnonymous = false;

    // Message reactions — emoji → Set of userIds who reacted
    @Builder.Default
    private Map<String, java.util.Set<String>> reactions = new HashMap<>();

    @org.springframework.data.mongodb.core.index.Indexed
    private LocalDateTime sentAt;
    private LocalDateTime readAt;   // null = unread

    public void onSend() {
        if (sentAt == null) sentAt = LocalDateTime.now();
        this.status = "sent";
    }
}
