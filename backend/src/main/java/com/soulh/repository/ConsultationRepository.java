package com.soulh.repository;

import com.soulh.model.Consultation;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface ConsultationRepository extends MongoRepository<Consultation, String> {
    List<Consultation> findByPatientIdOrderByCreatedAtDesc(String patientId);
    List<Consultation> findByDoctorIdOrderByCreatedAtDesc(String doctorId);
    List<Consultation> findByDoctorIdAndStatus(String doctorId, String status);
}
