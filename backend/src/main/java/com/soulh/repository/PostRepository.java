package com.soulh.repository;

import com.soulh.model.Post;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PostRepository extends MongoRepository<Post, String> {
    List<Post> findByCommunityIdOrderByCreatedAtDesc(String communityId);
    List<Post> findByCommunityIdInOrderByCreatedAtDesc(List<String> communityIds);
    List<Post> findByAuthorId(String authorId);
    void deleteByAuthorId(String authorId);
}
