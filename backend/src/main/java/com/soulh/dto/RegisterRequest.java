package com.soulh.dto;

import com.soulh.model.Role;
import lombok.Data;

/**
 * RegisterRequest - The data a user sends when signing up.
 */
@Data
public class RegisterRequest {
    private String name;
    private String email;
    private String password;
    private Role role; // USER or DOCTOR
    private String illnessCondition; // Works as specialty for doctors
    private String registrationNumber; // For doctors
    private Integer experience;
    private String qualification;
    private String hospital;
}
