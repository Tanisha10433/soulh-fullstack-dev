package com.soulh.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class PostResponseDTO {
    private String id;
    private String communityId;
    private UserDTO author;
    private String content;
    private String illnessTag;
    private String imageUrl;
    private String fileUrl;
    private boolean isAnonymous;
    private LocalDateTime createdAt;
    private java.util.List<UserDTO> likes;
}
