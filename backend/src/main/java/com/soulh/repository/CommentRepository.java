package com.soulh.repository;

import com.soulh.model.Comment;


import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentRepository extends org.springframework.data.mongodb.repository.MongoRepository<Comment, String> {
    List<Comment> findByPostIdOrderByCreatedAtAsc(String postId);
}
