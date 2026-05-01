package com.soulh.service;

import com.soulh.model.Message;
import com.soulh.model.User;
import com.soulh.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import com.soulh.dto.MessageResponseDTO;
import com.soulh.dto.UserDTO;
import com.soulh.repository.UserRepository;
import java.util.stream.Collectors;
import java.util.List;

/**
 * MessageService — Business logic for sending and retrieving messages.
 */
@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final ConnectionService connectionService;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    public List<MessageResponseDTO> getConversation(User me, User other) {
        return messageRepository.findBySenderIdAndReceiverIdOrReceiverIdAndSenderIdOrderBySentAtAsc(me.getId(), other.getId(), me.getId(), other.getId())
                .stream().map(this::mapMessageToDTO).collect(Collectors.toList());
    }

    /** Search messages in a conversation by keyword */
    public List<MessageResponseDTO> searchConversation(User me, User other, String keyword) {
        String kw = keyword == null ? "" : keyword.toLowerCase();
        return messageRepository.findBySenderIdAndReceiverIdOrReceiverIdAndSenderIdOrderBySentAtAsc(me.getId(), other.getId(), me.getId(), other.getId())
                .stream()
                .filter(m -> m.getContent() != null && m.getContent().toLowerCase().contains(kw))
                .map(this::mapMessageToDTO)
                .collect(Collectors.toList());
    }

    public MessageResponseDTO sendMessage(User sender, User receiver, String content) {
        return sendMessage(sender, receiver, content, null, null, false);
    }

    public MessageResponseDTO sendMessage(User sender, User receiver, String content, String voiceUrl) {
        return sendMessage(sender, receiver, content, voiceUrl, null, false);
    }

    public MessageResponseDTO sendMessage(User sender, User receiver, String content,
                                          String voiceUrl, String mood, boolean isAnonymous) {
        // Enforce: can only chat if connected
        if (!connectionService.areConnected(sender, receiver)) {
            throw new RuntimeException("You must be connected with this user to send messages.");
        }
        
        // Block check
        if (sender.getBlockedUserIds().contains(receiver.getId())) {
            throw new RuntimeException("You have blocked this user.");
        }
        if (receiver.getBlockedUserIds().contains(sender.getId())) {
            throw new RuntimeException("You have been blocked by this user.");
        }

        if ((content == null || content.isBlank()) && (voiceUrl == null || voiceUrl.isBlank())) {
            throw new RuntimeException("Message cannot be empty.");
        }

        Message msg = Message.builder()
                .senderId(sender.getId())
                .receiverId(receiver.getId())
                .content(content != null ? content.trim() : "🎤️ Voice Message")
                .voiceUrl(voiceUrl)
                .mood(mood)
                .isAnonymous(isAnonymous)
                .build();
        msg.onSend();
        Message saved = messageRepository.save(msg);

        MessageResponseDTO dto = mapMessageToDTO(saved);

        // Broadcast to receiver's private queue
        messagingTemplate.convertAndSendToUser(receiver.getId(), "/queue/messages", dto);
        // Broadcast back to sender's private queue so their UI updates
        messagingTemplate.convertAndSendToUser(sender.getId(), "/queue/messages", dto);

        return dto;
    }

    private MessageResponseDTO mapMessageToDTO(Message message) {
        User sender = userRepository.findById(message.getSenderId()).orElse(null);
        User receiver = userRepository.findById(message.getReceiverId()).orElse(null);

        UserDTO senderDTO;
        if (message.isAnonymous()) {
            senderDTO = UserDTO.builder()
                .id(message.getSenderId()) // Keep ID for logic but mask display
                .name("Anonymous Peer")
                .isVerified(false)
                .build();
        } else if (sender != null) {
            senderDTO = UserDTO.builder()
                .id(sender.getId()).name(sender.getName())
                .illnessCondition(sender.getIllnessCondition())
                .isVerified(sender.isVerified()).build();
        } else {
            senderDTO = null;
        }

        UserDTO receiverDTO = receiver != null ? UserDTO.builder()
                .id(receiver.getId()).name(receiver.getName())
                .build() : null;

        return MessageResponseDTO.builder()
                .id(message.getId())
                .sender(senderDTO)
                .receiver(receiverDTO)
                .content(message.getContent())
                .voiceUrl(message.getVoiceUrl())
                .mood(message.getMood())
                .status(message.getStatus())
                .isAnonymous(message.isAnonymous())
                .sentAt(message.getSentAt())
                .readAt(message.getReadAt())
                .reactions(message.getReactions())
                .build();
    }

    public void reactToMessage(String messageId, String userId, String emoji) {
        Message msg = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));
        
        java.util.Map<String, java.util.Set<String>> reactions = msg.getReactions();
        if (reactions == null) reactions = new java.util.HashMap<>();
        
        java.util.Set<String> users = reactions.computeIfAbsent(emoji, k -> new java.util.HashSet<>());
        
        if (users.contains(userId)) {
            users.remove(userId);
            if (users.isEmpty()) reactions.remove(emoji);
        } else {
            reactions.values().forEach(u -> u.remove(userId));
            reactions.entrySet().removeIf(e -> e.getValue().isEmpty());
            reactions.computeIfAbsent(emoji, k -> new java.util.HashSet<>()).add(userId);
        }
        
        msg.setReactions(reactions);
        messageRepository.save(msg);
        
        MessageResponseDTO dto = mapMessageToDTO(msg);
        messagingTemplate.convertAndSendToUser(msg.getReceiverId(), "/queue/messages", dto);
        messagingTemplate.convertAndSendToUser(msg.getSenderId(), "/queue/messages", dto);
    }

    public void markAsRead(String messageId) {
        Message msg = messageRepository.findById(messageId).orElse(null);
        if (msg != null && (msg.getStatus() == null || !msg.getStatus().equals("read"))) {
            msg.setStatus("read");
            msg.setReadAt(java.time.LocalDateTime.now());
            messageRepository.save(msg);
            
            MessageResponseDTO dto = mapMessageToDTO(msg);
            messagingTemplate.convertAndSendToUser(msg.getReceiverId(), "/queue/messages", dto);
            messagingTemplate.convertAndSendToUser(msg.getSenderId(), "/queue/messages", dto);
        }
    }
}
