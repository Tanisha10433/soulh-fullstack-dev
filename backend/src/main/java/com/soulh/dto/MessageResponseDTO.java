package com.soulh.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class MessageResponseDTO {
    private String id;
    private UserDTO sender;
    private UserDTO receiver;
    private String content;
    private String voiceUrl;
    private String mood;          // optional mood emoji selected by sender
    private String status;        // sent | delivered | read
    private boolean isAnonymous;
    private LocalDateTime sentAt;
    private LocalDateTime readAt; // null = unread
    private java.util.Map<String, java.util.Set<String>> reactions;
}
