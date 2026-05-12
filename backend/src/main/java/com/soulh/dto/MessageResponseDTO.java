package com.soulh.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
@com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
public class MessageResponseDTO {
    private String id;
    private UserDTO sender;
    private UserDTO receiver;
    // Flat convenience fields — always populated even if sender/receiver object is null
    private String senderId;
    private String senderName;
    private String receiverId;
    private String receiverName;
    private String content;
    private String voiceUrl;
    private String mood;          // optional mood emoji selected by sender
    private String status;        // sent | delivered | read
    private boolean isAnonymous;
    private java.time.LocalDateTime sentAt;
    private java.time.LocalDateTime readAt; // null = unread
    private java.util.Map<String, java.util.Set<String>> reactions;
}
