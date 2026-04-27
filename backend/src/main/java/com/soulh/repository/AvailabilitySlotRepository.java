package com.soulh.repository;

import com.soulh.model.AvailabilitySlot;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface AvailabilitySlotRepository extends MongoRepository<AvailabilitySlot, String> {
    List<AvailabilitySlot> findByDoctorIdAndIsBookedFalseAndStartTimeAfter(String doctorId, LocalDateTime after);
    List<AvailabilitySlot> findByDoctorId(String doctorId);
}
