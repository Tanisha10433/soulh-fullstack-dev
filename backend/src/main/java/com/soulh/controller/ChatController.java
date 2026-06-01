package com.soulh.controller;

import com.soulh.dto.ChatMessageRequest;
import com.soulh.model.User;
import com.soulh.service.MessageService;
import com.soulh.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Map;

/**
 * ChatController — STOMP WebSocket endpoint handler.
 */
@Controller
@RequiredArgsConstructor
@Slf4j
public class ChatController {

    private final MessageService messageService;
    private final UserService userService;
    private final SimpMessagingTemplate messagingTemplate;

    /** Handles /app/chat.sendMessage */
    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Payload ChatMessageRequest request, Principal principal) {
        if (principal == null) {
            log.warn("Unauthorized WS message attempt");
            return;
        }
        User sender = userService.getById(principal.getName());
        User receiver = userService.getById(request.getReceiverId());
        log.info("WS msg: {} → {}", sender.getName(), receiver.getName());
        messageService.sendMessage(sender, receiver, request.getContent(),
                request.getVoiceUrl(), request.getMood(), request.isAnonymous());
    }

    /**
     * Handles /app/chat.typing
     * Broadcasts typing status to the target user.
     * Payload: { receiverId: Long, typing: boolean }
     */
    @MessageMapping("/chat.typing")
    public void sendTyping(@Payload Map<String, Object> payload, Principal principal) {
        if (principal == null) return;
        User sender = userService.getById(principal.getName());
        Object receiverIdObj = payload.get("receiverId");
        if (receiverIdObj == null) return;
        String receiverId = receiverIdObj.toString();
        boolean typing = Boolean.TRUE.equals(payload.get("typing"));

        messagingTemplate.convertAndSendToUser(
            receiverId.toString(),
            "/queue/typing",
            Map.of("senderId", sender.getId(), "typing", typing)
        );
    }
    @MessageMapping("/chat.react")
    public void reactToMessage(@Payload Map<String, String> payload, Principal principal) {
        if (principal == null) return;
        User user = userService.getById(principal.getName());
        String messageId = payload.get("messageId");
        String emoji = payload.get("emoji");
        if (messageId != null && emoji != null) {
            messageService.reactToMessage(messageId, user.getId(), emoji);
        }
    }

    @MessageMapping("/chat.read")
    public void markAsRead(@Payload Map<String, String> payload, Principal principal) {
        if (principal == null) return;
        String messageId = payload.get("messageId");
        if (messageId != null) {
            messageService.markAsRead(messageId);
        }
    }
}
