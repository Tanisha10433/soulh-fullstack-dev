package com.soulh.repository;

import com.soulh.model.Notification;
import com.soulh.model.User;

import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends org.springframework.data.mongodb.repository.MongoRepository<Notification, String> {
    List<Notification> findByUserOrderByCreatedAtDesc(User user);
    long countByUserAndIsReadFalse(User user);
}
