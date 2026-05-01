package com.soulh.repository;

import com.soulh.model.ConsultationRequest;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface ConsultationRequestRepository extends MongoRepository<ConsultationRequest, String> {
    List<ConsultationRequest> findByDoctorIdAndStatus(String doctorId, String status);
    List<ConsultationRequest> findByDoctorId(String doctorId);
    List<ConsultationRequest> findByPatientId(String patientId);
}
