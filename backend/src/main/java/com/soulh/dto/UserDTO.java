package com.soulh.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserDTO {
    private String id;
    private String name;
    private String illnessCondition;

    // Explicit @JsonProperty to ensure Jackson serializes as "isVerified" not "verified"
    @JsonProperty("isVerified")
    private boolean isVerified;

    private String role;
}
