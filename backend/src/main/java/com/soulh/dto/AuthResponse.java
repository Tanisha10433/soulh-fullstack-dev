package com.soulh.dto;

import com.soulh.model.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

/**
 * AuthResponse - What we send back after successful login/register.
 * Contains the JWT token and basic user info.
 */
@Data
@Builder
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String refreshToken;
    private String userId;
    private String name;
    private String email;
    private Role role;
}
