package com.soulh.service;

import com.soulh.model.DoctorVerification;
import com.soulh.model.User;
import com.soulh.model.VerificationStatus;
import com.soulh.repository.DoctorVerificationRepository;
import com.soulh.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * DoctorVerificationService — Business logic for doctor verification workflow.
 */
@Service
@RequiredArgsConstructor
public class DoctorVerificationService {

    private final DoctorVerificationRepository verificationRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public DoctorVerification submit(User doctor, String registrationNumber) {
        return verificationRepository.save(DoctorVerification.builder()
                .doctor(doctor)
                .registrationNumber(registrationNumber)
                .status(VerificationStatus.PENDING)
                .build());
    }

    public List<DoctorVerification> getPending() {
        return verificationRepository.findByStatus(VerificationStatus.PENDING);
    }

    public List<DoctorVerification> getApproved() {
        return verificationRepository.findByStatus(VerificationStatus.APPROVED);
    }

    public DoctorVerification getVerificationForDoctor(User doctor) {
        return verificationRepository.findByDoctor(doctor).orElse(null);
    }

    @Transactional
    public DoctorVerification approve(String id) {
        DoctorVerification v = getById(id);
        v.setStatus(VerificationStatus.APPROVED);
        verificationRepository.save(v);

        // Mark the user as verified
        User doctor = v.getDoctor();
        doctor.setVerified(true);
        userRepository.save(doctor);

        notificationService.createAndSend(
            doctor, 
            "Your professional verification has been APPROVED. You now have the verified badge!", 
            "VERIFICATION_UPDATE"
        );

        return v;
    }

    public DoctorVerification reject(String id) {
        DoctorVerification v = getById(id);
        v.setStatus(VerificationStatus.REJECTED);
        DoctorVerification saved = verificationRepository.save(v);

        notificationService.createAndSend(
            v.getDoctor(), 
            "Your professional verification was rejected. Please contact support for details.", 
            "VERIFICATION_UPDATE"
        );

        return saved;
    }

    private DoctorVerification getById(String id) {
        return verificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Verification not found"));
    }
}
