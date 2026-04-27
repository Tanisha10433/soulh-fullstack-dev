package com.soulh.repository;

import com.soulh.model.Message;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends MongoRepository<Message, String> {
    List<Message> findBySenderIdAndReceiverIdOrReceiverIdAndSenderIdOrderBySentAtAsc(String senderId1, String receiverId1, String receiverId2, String senderId2);
    void deleteBySenderIdOrReceiverId(String senderId, String receiverId);
}
