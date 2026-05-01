package com.soulh.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "consultation_requests")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ConsultationRequest {
    @Id
    private String id;
    private String patientId;
    private String doctorId;
    private String condition;
    private String status; // PENDING, ACCEPTED, REJECTED
    private LocalDateTime scheduledTime;
    private LocalDateTime createdAt;
}
