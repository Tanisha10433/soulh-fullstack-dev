package com.soulh.repository;

import com.soulh.model.User;

import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends org.springframework.data.mongodb.repository.MongoRepository<User, String> {
    Optional<User> findByEmail(String email);

    // Used by search feature — finds public profiles matching a condition keyword
    List<User> findByIllnessConditionContainingIgnoreCaseAndIsPublicProfileTrue(String condition);

    long countByRole(com.soulh.model.Role role);
    long countByRoleAndIsVerifiedTrue(com.soulh.model.Role role);
    List<User> findByRoleAndIsVerifiedTrue(com.soulh.model.Role role);

    // Discover peers with same condition
    List<User> findByRoleAndIllnessConditionAndIdNotAndIsPublicProfileTrue(com.soulh.model.Role role, String condition, String exludeId);
}
