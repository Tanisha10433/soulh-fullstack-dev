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
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
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
        return mapPostsToDTO(List.of(postRepository.save(post))).get(0);
    }

    public List<PostResponseDTO> getJoinedFeed(User user) {
        List<String> communityIds = communityRepository.findByMembersContaining(user)
                .stream().map(Community::getId).toList();
        return mapPostsToDTO(postRepository.findByCommunityIdInOrderByCreatedAtDesc(communityIds));
    }

    public List<PostResponseDTO> getAllPosts() {
        return mapPostsToDTO(postRepository.findAll().stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .collect(Collectors.toList()));
    }

    public List<PostResponseDTO> getPaginatedPosts(int page, int size) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size, org.springframework.data.domain.Sort.by("createdAt").descending());
        return mapPostsToDTO(postRepository.findAll(pageable).getContent());
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
        return mapPostsToDTO(List.of(postRepository.save(post))).get(0);
    }

    public List<PostResponseDTO> getCommunityPosts(String communityId, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return mapPostsToDTO(postRepository.findByCommunityId(communityId, pageable));
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
        return mapPostsToDTO(List.of(postRepository.save(post))).get(0);
    }

    public void deletePost(String postId, String userId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));
        if (!post.getAuthorId().equals(userId)) {
            throw new RuntimeException("You can only delete your own posts");
        }
        postRepository.deleteById(postId);
    }

    private List<PostResponseDTO> mapPostsToDTO(List<Post> posts) {
        Set<String> userIds = new HashSet<>();
        for (Post post : posts) {
            if (!post.isAnonymous() && post.getAuthorId() != null) {
                userIds.add(post.getAuthorId());
            }
            if (post.getLikeUserIds() != null) {
                userIds.addAll(post.getLikeUserIds());
            }
        }

        Map<String, User> usersById = new HashMap<>();
        if (!userIds.isEmpty()) {
            userRepository.findAllById(userIds).forEach(user -> usersById.put(user.getId(), user));
        }

        return posts.stream()
                .map(post -> mapPostToDTO(post, usersById))
                .collect(Collectors.toList());
    }

    private PostResponseDTO mapPostToDTO(Post post, Map<String, User> usersById) {
        User author = usersById.get(post.getAuthorId());
        
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
                .map(usersById::get)
                .filter(java.util.Objects::nonNull)
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
