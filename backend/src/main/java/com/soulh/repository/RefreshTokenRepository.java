package com.soulh.repository;

import com.soulh.model.RefreshToken;
import com.soulh.model.User;

import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends org.springframework.data.mongodb.repository.MongoRepository<RefreshToken, String> {
    Optional<RefreshToken> findByToken(String token);
    int deleteByUser(User user);
}
