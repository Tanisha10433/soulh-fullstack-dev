package com.soulh.repository;

import com.soulh.model.ConnectionRequest;
import com.soulh.model.RequestStatus;
import com.soulh.model.User;


import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConnectionRequestRepository extends org.springframework.data.mongodb.repository.MongoRepository<ConnectionRequest, String> {

    // JOIN FETCH sender+receiver in ONE query — prevents N+1 selects
    
    List<ConnectionRequest> findBySenderAndStatusOrReceiverAndStatus(User sender, RequestStatus status1, User receiver, RequestStatus status2);
    List<ConnectionRequest> findBySenderOrReceiver(User sender, User receiver);

    default List<ConnectionRequest> findPendingForUser(String userId, RequestStatus status) {
        User user = new User();
        user.setId(userId);
        return findBySenderAndStatusOrReceiverAndStatus(user, status, user, status);
    }

    default List<ConnectionRequest> findAcceptedForUser(String userId, RequestStatus status) {
        User user = new User();
        user.setId(userId);
        return findBySenderAndStatusOrReceiverAndStatus(user, status, user, status);
    }

    default List<ConnectionRequest> findAllForUser(String userId) {
        User user = new User();
        user.setId(userId);
        return findBySenderOrReceiver(user, user);
    }

    Optional<ConnectionRequest> findBySenderAndReceiver(User sender, User receiver);
    boolean existsBySenderAndReceiver(User sender, User receiver);
    void deleteBySenderOrReceiver(User sender, User receiver);
}
