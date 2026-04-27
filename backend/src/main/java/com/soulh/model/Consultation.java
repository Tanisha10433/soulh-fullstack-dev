package com.soulh.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "consultations")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Consultation {

    @Id
    private String id;

    private String patientId;
    private String doctorId;
    private String slotId;

    // Status lifecycle: PENDING → CONFIRMED → COMPLETED / CANCELLED
    @Builder.Default
    private String status = "PENDING";

    // Jitsi room URL — auto-generated on confirmation
    private String meetingUrl;

    // Payment info
    private String razorpayOrderId;
    private String razorpayPaymentId;
    private Double amountPaid;

    // Post-consultation note written by doctor
    private String doctorSummary;

    private LocalDateTime scheduledAt;
    private LocalDateTime createdAt;
}
