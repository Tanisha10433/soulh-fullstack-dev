package com.soulh.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "reports")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Report {
    @Id
    private String id;
    private String reporterId;
    private String reportedUserId;
    private String reason; // HARASSMENT, SPAM, INAPPROPRIATE, OTHER
    private String description;
    private String contextMessageId; // Optional: specific message that triggered the report
    
    @Builder.Default
    private boolean resolved = false;
    
    private LocalDateTime createdAt;
    
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
