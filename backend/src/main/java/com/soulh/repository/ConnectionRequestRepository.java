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
    
    @org.springframework.data.mongodb.repository.Query("{ '$or': [ { 'sender._id': ?0 }, { 'receiver._id': ?0 } ], 'status': ?1 }")
    List<ConnectionRequest> findPendingForUser(String userId, RequestStatus status);

    @org.springframework.data.mongodb.repository.Query("{ '$or': [ { 'sender._id': ?0 }, { 'receiver._id': ?0 } ], 'status': ?1 }")
    List<ConnectionRequest> findAcceptedForUser(String userId, RequestStatus status);

    @org.springframework.data.mongodb.repository.Query("{ '$or': [ { 'sender._id': ?0 }, { 'receiver._id': ?0 } ] }")
    List<ConnectionRequest> findAllForUser(String userId);

    Optional<ConnectionRequest> findBySenderAndReceiver(User sender, User receiver);
    boolean existsBySenderAndReceiver(User sender, User receiver);
    void deleteBySenderOrReceiver(User sender, User receiver);
}
