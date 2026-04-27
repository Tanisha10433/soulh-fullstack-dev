package com.soulh.service;

import com.soulh.model.Comment;
import com.soulh.model.Community;
import com.soulh.model.Post;
import com.soulh.model.User;
import com.soulh.repository.CommentRepository;
import com.soulh.repository.CommunityRepository;
import com.soulh.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import com.soulh.dto.PostResponseDTO;
import com.soulh.dto.UserDTO;
import java.util.stream.Collectors;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CommunityService {

    private final CommunityRepository communityRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final com.soulh.repository.UserRepository userRepository;

    public List<Community> getAllCommunities() {
        return communityRepository.findAll();
    }

    public Community getCommunity(String id) {
        return communityRepository.findById(id).orElseThrow(() -> new RuntimeException("Community not found"));
    }

    public void joinCommunity(String communityId, User user) {
        Community community = getCommunity(communityId);
        community.getMembers().add(user);
        communityRepository.save(community);
    }

    public void leaveCommunity(String communityId, User user) {
        Community community = getCommunity(communityId);
        community.getMembers().removeIf(m -> m.getId().equals(user.getId()));
        communityRepository.save(community);
    }

    public PostResponseDTO toggleLikePost(String postId, User user) {
        Post post = postRepository.findById(postId).orElseThrow(() -> new RuntimeException("Post not found"));
        boolean removed = post.getLikeUserIds().removeIf(id -> id.equals(user.getId()));
        if (!removed) {
            post.getLikeUserIds().add(user.getId());
        }
        return mapPostToDTO(postRepository.save(post));
    }

    public List<PostResponseDTO> getJoinedFeed(User user) {
        List<String> communityIds = communityRepository.findByMembersContaining(user)
                .stream().map(Community::getId).toList();
        return postRepository.findByCommunityIdInOrderByCreatedAtDesc(communityIds)
                .stream().map(this::mapPostToDTO).collect(Collectors.toList());
    }

    public List<PostResponseDTO> getAllPosts() {
        return postRepository.findAll().stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(this::mapPostToDTO).collect(Collectors.toList());
    }

    public PostResponseDTO createPost(String communityId, User author, String content, String imageUrl, String fileUrl, String illnessTag, boolean isAnonymous) {
        Post post = Post.builder()
                .communityId(communityId)
                .authorId(author.getId())
                .content(content)
                .imageUrl(imageUrl)
                .fileUrl(fileUrl)
                .illnessTag(illnessTag)
                .isAnonymous(isAnonymous)
                .createdAt(java.time.LocalDateTime.now())
                .build();
        return mapPostToDTO(postRepository.save(post));
    }

    public List<PostResponseDTO> getCommunityPosts(String communityId) {
        return postRepository.findByCommunityIdOrderByCreatedAtDesc(communityId)
                .stream().map(this::mapPostToDTO).collect(Collectors.toList());
    }

    public Comment addComment(String postId, User author, String content) {
        Comment comment = Comment.builder()
                .postId(postId)
                .author(author)
                .content(content)
                .createdAt(java.time.LocalDateTime.now())
                .build();
        return commentRepository.save(comment);
    }

    public List<Comment> getPostComments(String postId) {
        return commentRepository.findByPostIdOrderByCreatedAtAsc(postId);
    }

    public PostResponseDTO updatePost(String postId, String userId, String newContent) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));
        if (!post.getAuthorId().equals(userId)) {
            throw new RuntimeException("You can only edit your own posts");
        }
        post.setContent(newContent);
        return mapPostToDTO(postRepository.save(post));
    }

    public void deletePost(String postId, String userId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));
        if (!post.getAuthorId().equals(userId)) {
            throw new RuntimeException("You can only delete your own posts");
        }
        postRepository.deleteById(postId);
    }

    private PostResponseDTO mapPostToDTO(Post post) {
        User author = userRepository.findById(post.getAuthorId()).orElse(null);
        
        UserDTO authorDTO;
        if (post.isAnonymous()) {
            authorDTO = UserDTO.builder()
                    .name("Anonymous Warrior")
                    .isVerified(false)
                    .role("USER")
                    .build();
        } else if (author != null) {
            authorDTO = UserDTO.builder()
                    .id(author.getId())
                    .name(author.getName())
                    .illnessCondition(author.getIllnessCondition())
                    .isVerified(author.isVerified())
                    .role(author.getRole().name())
                    .build();
        } else {
            authorDTO = UserDTO.builder().name("Unknown").build();
        }

        List<UserDTO> likes = post.getLikeUserIds() != null ? post.getLikeUserIds().stream()
                .map(id -> userRepository.findById(id).orElse(null))
                .filter(u -> u != null)
                .map(u -> UserDTO.builder()
                        .id(u.getId())
                        .name(u.getName())
                        .build())
                .collect(Collectors.toList()) : java.util.Collections.emptyList();

        return PostResponseDTO.builder()
                .id(post.getId())
                .communityId(post.getCommunityId())
                .author(authorDTO)
                .content(post.getContent())
                .illnessTag(post.getIllnessTag())
                .imageUrl(post.getImageUrl())
                .fileUrl(post.getFileUrl())
                .isAnonymous(post.isAnonymous())
                .createdAt(post.getCreatedAt())
                .likes(likes)
                .build();
    }
}
