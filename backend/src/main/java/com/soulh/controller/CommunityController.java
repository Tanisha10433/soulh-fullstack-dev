package com.soulh.controller;

import com.soulh.model.User;
import com.soulh.service.CommunityService;
import com.soulh.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Collections;

@RestController
@RequestMapping("/api/communities")
@CrossOrigin
@RequiredArgsConstructor
public class CommunityController {

    private final CommunityService communityService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<?> getAll() {
        return ResponseEntity.ok(communityService.getAllCommunities());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable String id) {
        return ResponseEntity.ok(communityService.getCommunity(id));
    }

    @GetMapping("/{id}/posts")
    public ResponseEntity<?> getPosts(@PathVariable String id) {
        return ResponseEntity.ok(communityService.getCommunityPosts(id));
    }

    @PostMapping("/{id}/posts")
    public ResponseEntity<?> createPost(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails ud,
            @RequestBody Map<String, String> body) {
        User author = userService.getByEmail(ud.getUsername());
        boolean isAnonymous = body.containsKey("isAnonymous") && Boolean.parseBoolean(body.get("isAnonymous"));
        return ResponseEntity.ok(communityService.createPost(id, author, body.get("content"), body.get("imageUrl"), body.get("fileUrl"), body.get("illnessTag"), isAnonymous));
    }

    @PatchMapping("/posts/{postId}")
    public ResponseEntity<?> updatePost(
            @PathVariable String postId,
            @AuthenticationPrincipal UserDetails ud,
            @RequestBody Map<String, String> body) {
        User user = userService.getByEmail(ud.getUsername());
        return ResponseEntity.ok(communityService.updatePost(postId, user.getId(), body.get("content")));
    }

    @DeleteMapping("/posts/{postId}")
    public ResponseEntity<?> deletePost(
            @PathVariable String postId,
            @AuthenticationPrincipal UserDetails ud) {
        User user = userService.getByEmail(ud.getUsername());
        communityService.deletePost(postId, user.getId());
        return ResponseEntity.ok(Collections.singletonMap("message", "Post deleted"));
    }

    @PostMapping("/posts/{postId}/like")
    public ResponseEntity<?> likePost(
            @PathVariable String postId,
            @AuthenticationPrincipal UserDetails ud) {
        User user = userService.getByEmail(ud.getUsername());
        return ResponseEntity.ok(communityService.toggleLikePost(postId, user));
    }

    @GetMapping("/feed")
    public ResponseEntity<?> getFeed(@AuthenticationPrincipal UserDetails ud) {
        User user = userService.getByEmail(ud.getUsername());
        return ResponseEntity.ok(communityService.getJoinedFeed(user));
    }

    @PostMapping("/{id}/join")
    public ResponseEntity<?> join(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails ud) {
        User user = userService.getByEmail(ud.getUsername());
        communityService.joinCommunity(id, user);
        return ResponseEntity.ok(Collections.singletonMap("message", "Joined"));
    }

    @PostMapping("/{id}/leave")
    public ResponseEntity<?> leave(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails ud) {
        User user = userService.getByEmail(ud.getUsername());
        communityService.leaveCommunity(id, user);
        return ResponseEntity.ok(Collections.singletonMap("message", "Left"));
    }

    @PostMapping("/posts/{postId}/comments")
    public ResponseEntity<?> addComment(
            @PathVariable String postId,
            @AuthenticationPrincipal UserDetails ud,
            @RequestBody Map<String, String> body) {
        User author = userService.getByEmail(ud.getUsername());
        return ResponseEntity.ok(communityService.addComment(postId, author, body.get("content")));
    }

    @GetMapping("/posts/{postId}/comments")
    public ResponseEntity<?> getComments(@PathVariable String postId) {
        return ResponseEntity.ok(communityService.getPostComments(postId));
    }
}
