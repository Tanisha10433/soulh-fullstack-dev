package com.soulh.repository;

import com.soulh.model.Community;

import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommunityRepository extends org.springframework.data.mongodb.repository.MongoRepository<Community, String> {
    List<Community> findByIllnessConditionContainingIgnoreCase(String condition);
    List<Community> findByMembersContaining(com.soulh.model.User user);
}
