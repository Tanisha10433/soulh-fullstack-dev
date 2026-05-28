package com.soulh.controller;

import com.soulh.dto.AuthResponse;
import com.soulh.dto.LoginRequest;
import com.soulh.dto.RegisterRequest;
import com.soulh.model.User;
import com.soulh.security.JwtUtil;
import com.soulh.service.AuthService;
import com.soulh.service.RefreshTokenService;
import com.soulh.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.*;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;

import java.util.Collections;
import java.util.Map;

/**
 * AuthController - Public endpoints for login, register, token refresh, and OAuth.
 */
@RestController
@RequestMapping("/api/auth")
@CrossOrigin
@RequiredArgsConstructor
public class AuthController {

    @Value("${app.google-client-id:}")
    private String googleClientId;

    private final AuthService authService;
    private final UserService userService;
    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;
    private final RefreshTokenService refreshTokenService;
    private final com.soulh.service.RateLimitService rateLimitService;

    @PostMapping("/register")
    public ResponseEntity<?> register(
            @RequestBody RegisterRequest request,
            jakarta.servlet.http.HttpServletRequest httpRequest) {
        if (!rateLimitService.isAllowed(httpRequest.getRemoteAddr())) {
            return ResponseEntity.status(429).body(Map.of("error", "Too many requests. Please wait a moment."));
        }
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody LoginRequest request,
            jakarta.servlet.http.HttpServletRequest httpRequest) {
        if (!rateLimitService.isAllowed(httpRequest.getRemoteAddr())) {
            return ResponseEntity.status(429).body(Map.of("error", "Too many requests. Please wait a moment."));
        }
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(@RequestBody com.soulh.dto.TokenRefreshRequest request) {
        String requestRefreshToken = request.getRefreshToken();
        return refreshTokenService.findByToken(requestRefreshToken)
                .map(refreshTokenService::verifyExpiration)
                .map(com.soulh.model.RefreshToken::getUser)
                .map(user -> {
                    String token = jwtUtil.generateToken(userDetailsService.loadUserByUsername(user.getEmail()));
                    return ResponseEntity.ok(new com.soulh.dto.TokenRefreshResponse(token, requestRefreshToken));
                })
                .orElseThrow(() -> new RuntimeException("Refresh token is not in database!"));
    }

    /**
     * Google OAuth 2.0 / OIDC sign-in.
     * Frontend sends the Google ID token; backend decodes it and returns a SoulH JWT.
     * For production: add google-auth-library for full cryptographic token verification.
     */
    @PostMapping("/oauth2/google")
    public ResponseEntity<?> googleLogin(@RequestBody Map<String, String> body) {
        String idToken = body.get("idToken");
        if (idToken == null || idToken.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "idToken is required"));
        }
        try {
            if (googleClientId != null && !googleClientId.isBlank() && !googleClientId.equals("YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com")) {
                GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new GsonFactory())
                        .setAudience(Collections.singletonList(googleClientId))
                        .build();

                GoogleIdToken idTokenObj = verifier.verify(idToken);
                if (idTokenObj == null) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Invalid Google ID token signature or expired token"));
                }

                GoogleIdToken.Payload payload = idTokenObj.getPayload();
                String email = payload.getEmail();
                String name = (String) payload.get("name");
                if (name == null) name = email.split("@")[0];
                String sub = payload.getSubject();

                User user = userService.findOrCreateFromOAuth(email, name, "google", sub);
                String jwt = jwtUtil.generateToken(userDetailsService.loadUserByUsername(user.getEmail()));

                return ResponseEntity.ok(new AuthResponse(jwt, null, user.getId(), user.getName(), user.getEmail(), user.getRole()));
            } else {
                // Fallback for development if client ID is not configured
                String[] parts = idToken.split("\\.");
                String payloadJson = new String(java.util.Base64.getUrlDecoder().decode(
                    parts[1] + "=".repeat((4 - parts[1].length() % 4) % 4)
                ));
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                Map<?, ?> claims = mapper.readValue(payloadJson, Map.class);

                String email = (String) claims.get("email");
                String name  = claims.containsKey("name") ? (String) claims.get("name") : email.split("@")[0];
                String sub   = (String) claims.get("sub");

                User user = userService.findOrCreateFromOAuth(email, name, "google", sub);
                String jwt = jwtUtil.generateToken(userDetailsService.loadUserByUsername(user.getEmail()));

                return ResponseEntity.ok(new AuthResponse(jwt, null, user.getId(), user.getName(), user.getEmail(), user.getRole()));
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid Google token: " + e.getMessage()));
        }
    }
}
