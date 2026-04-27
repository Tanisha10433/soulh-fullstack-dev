package com.soulh.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "availability_slots")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class AvailabilitySlot {

    @Id
    private String id;

    private String doctorId;

    private LocalDateTime startTime;
    private LocalDateTime endTime;

    @Builder.Default
    private boolean isBooked = false;

    private LocalDateTime createdAt;
}
