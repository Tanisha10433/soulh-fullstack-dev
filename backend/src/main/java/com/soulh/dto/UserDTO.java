package com.soulh.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserDTO {
    private String id;
    private String name;
    private String illnessCondition;
    private boolean isVerified;
    private String role;
}
