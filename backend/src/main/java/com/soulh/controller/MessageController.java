package com.soulh.controller;

import com.soulh.dto.MessageResponseDTO;
import com.soulh.model.Message;
import com.soulh.model.User;
import com.soulh.repository.MessageRepository;
import com.soulh.service.MessageService;
import com.soulh.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/messages")
@CrossOrigin
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;
    private final UserService userService;
    private final MessageRepository messageRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /** Fetch full conversation history */
    @GetMapping("/conversation/{otherUserId}")
    public ResponseEntity<List<MessageResponseDTO>> getConversation(
            @AuthenticationPrincipal UserDetails ud,
            @PathVariable String otherUserId) {
        var me = userService.getByEmail(ud.getUsername());
        var other = userService.getById(otherUserId);
        return ResponseEntity.ok(messageService.getConversation(me, other));
    }

    /** Search messages in a conversation by keyword */
    @GetMapping("/search/{otherUserId}")
    public ResponseEntity<List<MessageResponseDTO>> searchMessages(
            @AuthenticationPrincipal UserDetails ud,
            @PathVariable String otherUserId,
            @RequestParam(defaultValue = "") String q) {
        var me = userService.getByEmail(ud.getUsername());
        var other = userService.getById(otherUserId);
        return ResponseEntity.ok(messageService.searchConversation(me, other, q));
    }

    /** REST send (fallback if WebSocket unavailable) */
    @PostMapping("/send/{receiverId}")
    public ResponseEntity<MessageResponseDTO> send(
            @AuthenticationPrincipal UserDetails ud,
            @PathVariable String receiverId,
            @RequestBody Map<String, String> body) {
        var sender = userService.getByEmail(ud.getUsername());
        var receiver = userService.getById(receiverId);
        return ResponseEntity.ok(messageService.sendMessage(sender, receiver, body.get("content")));
    }

    /** Mark messages as read (generates read receipts) */
    @PostMapping("/read/{senderId}")
    public ResponseEntity<?> markRead(
            @AuthenticationPrincipal UserDetails ud,
            @PathVariable String senderId) {
        User me = userService.getByEmail(ud.getUsername());
        List<Message> conv = messageRepository
                .findBySenderIdAndReceiverIdOrReceiverIdAndSenderIdOrderBySentAtAsc(
                        senderId, me.getId(), me.getId(), senderId);

        LocalDateTime now = LocalDateTime.now();
        List<Message> toMark = conv.stream()
                .filter(m -> m.getSenderId().equals(senderId) && m.getReadAt() == null)
                .toList();
        toMark.forEach(m -> m.setReadAt(now));
        if (!toMark.isEmpty()) {
            messageRepository.saveAll(toMark);
            // Notify sender their messages were read
            messagingTemplate.convertAndSendToUser(
                senderId.toString(), "/queue/read-receipts",
                Map.of("readBefore", now.toString(), "byUserId", me.getId())
            );
        }

        return ResponseEntity.ok(Map.of("markedRead", toMark.size()));
    }

    /** Toggle reaction on a message */
    @PostMapping("/{messageId}/react")
    public ResponseEntity<?> react(
            @PathVariable String messageId,
            @AuthenticationPrincipal UserDetails ud,
            @RequestBody Map<String, String> body) {
        User me = userService.getByEmail(ud.getUsername());
        String emoji = body.get("emoji");
        if (emoji == null || emoji.isBlank()) return ResponseEntity.badRequest().build();

        Message msg = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        Map<String, java.util.Set<String>> reactions = msg.getReactions();
        if (reactions == null) reactions = new HashMap<>();

        Set<String> reactors = reactions.computeIfAbsent(emoji, k -> new HashSet<>());
        if (reactors.contains(me.getId())) {
            reactors.remove(me.getId()); // toggle off
        } else {
            reactors.add(me.getId());    // toggle on
        }
        if (reactors.isEmpty()) reactions.remove(emoji);
        msg.setReactions(reactions);
        Message saved = messageRepository.save(msg);

        // Broadcast updated reactions to both participants
        Map<String, Object> update = Map.of("messageId", messageId, "reactions", saved.getReactions());
        messagingTemplate.convertAndSendToUser(msg.getSenderId().toString(), "/queue/reactions", update);
        messagingTemplate.convertAndSendToUser(msg.getReceiverId().toString(), "/queue/reactions", update);

        return ResponseEntity.ok(saved.getReactions());
    }
}
