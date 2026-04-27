package com.soulh.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageRequest {
    private String receiverId;
    private String content;
    private String voiceUrl;    // optional — set when sending a voice memo
    private String mood;        // optional mood emoji (😊 😔 😣 😴 ❤️)
    private boolean isAnonymous;
}
