package com.soulh.service;

import com.soulh.model.Notification;
import com.soulh.model.User;
import com.soulh.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public void createAndSend(User user, String message, String type) {
        Notification notification = notificationRepository.save(Notification.builder()
                .user(user)
                .message(message)
                .type(type)
                .build());

        // Broadcast to user's private notification queue
        messagingTemplate.convertAndSendToUser(
                user.getId().toString(),
                "/queue/notifications",
                notification
        );
    }

    public List<Notification> getNotificationsForUser(User user) {
        return notificationRepository.findByUserOrderByCreatedAtDesc(user);
    }

    public void markAsRead(String notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            n.setRead(true);
            notificationRepository.save(n);
        });
    }

    public long getUnreadCount(User user) {
        return notificationRepository.countByUserAndIsReadFalse(user);
    }
}
