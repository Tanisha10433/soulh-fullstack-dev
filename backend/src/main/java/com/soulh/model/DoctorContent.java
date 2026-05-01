package com.soulh.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "doctor_content")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class DoctorContent {
    @Id
    private String id;
    private String doctorId;
    private String title;
    private String content;
    private String type; // ARTICLE, TIP
    private LocalDateTime createdAt;
}
