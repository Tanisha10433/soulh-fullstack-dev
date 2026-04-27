package com.soulh.repository;

import com.soulh.model.DoctorVerification;
import com.soulh.model.VerificationStatus;

import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DoctorVerificationRepository extends org.springframework.data.mongodb.repository.MongoRepository<DoctorVerification, String> {
    List<DoctorVerification> findByStatus(VerificationStatus status);
    java.util.Optional<DoctorVerification> findByDoctor(com.soulh.model.User doctor);
}
