package com.soulh.repository;

import com.soulh.model.PatientVerification;
import com.soulh.model.User;
import com.soulh.model.VerificationStatus;

import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PatientVerificationRepository extends org.springframework.data.mongodb.repository.MongoRepository<PatientVerification, String> {
    List<PatientVerification> findByStatus(VerificationStatus status);
    List<PatientVerification> findByStatusNot(VerificationStatus status);
    Optional<PatientVerification> findByPatient(User patient);
    long countByStatus(VerificationStatus status);
}
