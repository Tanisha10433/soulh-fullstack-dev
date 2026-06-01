package com.soulh.controller;

import com.soulh.model.ConnectionRequest;
import com.soulh.service.ConnectionService;
import com.soulh.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/connections")
@CrossOrigin
@RequiredArgsConstructor
public class ConnectionController {

    private final ConnectionService connectionService;
    private final UserService userService;

    @PostMapping("/request/{targetUserId}")
    public ResponseEntity<?> sendRequest(
            @AuthenticationPrincipal UserDetails ud,
            @PathVariable String targetUserId) {
        var sender = userService.getByEmail(ud.getUsername());
        var receiver = userService.getById(targetUserId);
        return ResponseEntity.ok(connectionService.sendRequest(sender, receiver));
    }

    @GetMapping("/pending")
    public ResponseEntity<List<ConnectionRequest>> getPending(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(connectionService.getPendingRequests(userService.getByEmail(ud.getUsername())));
    }

    @GetMapping
    public ResponseEntity<List<ConnectionRequest>> getConnections(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(connectionService.getAcceptedConnections(userService.getByEmail(ud.getUsername())));
    }

    @PatchMapping("/{requestId}")
    public ResponseEntity<?> respond(
            @AuthenticationPrincipal UserDetails ud,
            @PathVariable String requestId,
            @RequestBody Map<String, String> body) {
        var me = userService.getByEmail(ud.getUsername());
        return ResponseEntity.ok(connectionService.respond(requestId, me, body.get("action")));
    }

    @GetMapping("/status/{targetUserId}")
    public ResponseEntity<?> checkConnectionStatus(
            @AuthenticationPrincipal UserDetails ud,
            @PathVariable String targetUserId) {
        var me = userService.getByEmail(ud.getUsername());
        var other = userService.getById(targetUserId);
        boolean connected = connectionService.areConnected(me, other);
        return ResponseEntity.ok(Map.of("connected", connected));
    }
}
