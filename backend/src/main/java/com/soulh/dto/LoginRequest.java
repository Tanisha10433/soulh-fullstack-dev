package com.soulh.dto;

import lombok.Data;

/**
 * LoginRequest - The data a user sends when logging in.
 */
@Data
public class LoginRequest {
    private String email;
    private String password;
}
