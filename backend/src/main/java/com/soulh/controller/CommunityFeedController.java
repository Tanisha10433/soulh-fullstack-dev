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

@RestController
@RequestMapping("/api/posts")
@CrossOrigin
@RequiredArgsConstructor
public class CommunityFeedController {

    private final CommunityService communityService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<?> getAll() {
        return ResponseEntity.ok(communityService.getAllPosts());
    }

    @PostMapping
    public ResponseEntity<?> createPost(
            @AuthenticationPrincipal UserDetails ud,
            @RequestBody Map<String, String> body) {
        User author = userService.getByEmail(ud.getUsername());
        
        String content = body.get("content");
        String imageUrl = body.get("imageUrl");
        String fileUrl = body.get("fileUrl");
        String illnessTag = body.get("illnessTag");
        boolean isAnonymous = Boolean.parseBoolean(body.get("isAnonymous"));
        
        // Use a default community ID or null if it's a global post
        String communityId = body.getOrDefault("communityId", "global");
        
        return ResponseEntity.ok(communityService.createPost(communityId, author, content, imageUrl, fileUrl, illnessTag, isAnonymous));
    }

    @PostMapping("/{postId}/comments")
    public ResponseEntity<?> addComment(
            @PathVariable String postId,
            @AuthenticationPrincipal UserDetails ud,
            @RequestBody Map<String, String> body) {
        User author = userService.getByEmail(ud.getUsername());
        return ResponseEntity.ok(communityService.addComment(postId, author, body.get("content")));
    }

    @GetMapping("/{postId}/comments")
    public ResponseEntity<?> getComments(@PathVariable String postId) {
        return ResponseEntity.ok(communityService.getPostComments(postId));
    }
}
