package com.soulh.service;

import com.soulh.model.Role;
import com.soulh.model.User;
import com.soulh.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * UserService — Business logic for user profile and search.
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.soulh.repository.MessageRepository messageRepository;
    private final com.soulh.repository.PostRepository postRepository;
    private final com.soulh.repository.ConnectionRequestRepository connectionRequestRepository;
    private final com.soulh.repository.ReportRepository reportRepository;

    public User getByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public User getById(String id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public List<User> searchByCondition(String condition) {
        return userRepository.findByIllnessConditionContainingIgnoreCaseAndIsPublicProfileTrue(condition);
    }

    public User updateProfile(String email, String illnessCondition, boolean isPublicProfile) {
        User user = getByEmail(email);
        if (illnessCondition != null) user.setIllnessCondition(illnessCondition);
        user.setPublicProfile(isPublicProfile);
        return userRepository.save(user);
    }

    /** Update doctor-specific profile fields */
    public User updateDoctorProfile(String email, Map<String, String> fields) {
        User user = getByEmail(email);
        if (fields.containsKey("name") && !fields.get("name").isBlank())
            user.setName(fields.get("name"));
        if (fields.containsKey("specialization"))
            user.setIllnessCondition(fields.get("specialization"));
        if (fields.containsKey("qualification"))
            user.setQualification(fields.get("qualification"));
        if (fields.containsKey("hospital"))
            user.setHospital(fields.get("hospital"));
        if (fields.containsKey("experience")) {
            try { user.setExperience(Integer.parseInt(fields.get("experience"))); }
            catch (NumberFormatException ignored) {}
        }
        return userRepository.save(user);
    }

    public List<User> discoverPeers(User user) {
        if (user.getIllnessCondition() == null || user.getIllnessCondition().isBlank()) {
            return userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.USER && !u.getId().equals(user.getId()) && u.isPublicProfile())
                .toList();
        }
        return userRepository.findByRoleAndIllnessConditionAndIdNotAndIsPublicProfileTrue(
            Role.USER, 
            user.getIllnessCondition(), 
            user.getId()
        );
    }

    /** Privacy settings update */
    public User updatePrivacy(String email, Map<String, Boolean> settings) {
        User user = getByEmail(email);
        if (settings.containsKey("showInSearch"))        user.setShowInSearch(settings.get("showInSearch"));
        if (settings.containsKey("showIllness"))         user.setShowIllness(settings.get("showIllness"));
        if (settings.containsKey("allowDirectMessages")) user.setAllowDirectMessages(settings.get("allowDirectMessages"));
        if (settings.containsKey("publicProfile"))       user.setPublicProfile(settings.get("publicProfile"));
        return userRepository.save(user);
    }

    /** GDPR — delete account and all associated data */
    @Transactional
    public void deleteAccount(String email) {
        User user = getByEmail(email);
        // Anonymize MongoDB posts rather than hard-delete (preserves community value)
        postRepository.findByAuthorId(user.getId()).forEach(p -> {
            p.setAuthorId(null);
            p.setAnonymous(true);
            postRepository.save(p);
        });
        // Delete MongoDB messages
        messageRepository.deleteBySenderIdOrReceiverId(user.getId(), user.getId());
        // Delete JPA relationships (cascade handles child rows)
        connectionRequestRepository.deleteBySenderOrReceiver(user, user);
        userRepository.delete(user);
    }

    /** E2E encryption key management */
    public void savePublicKey(String email, String publicKey) {
        User user = getByEmail(email);
        user.setE2ePublicKey(publicKey);
        userRepository.save(user);
    }

    public String getPublicKey(String userId) {
        return getById(userId).getE2ePublicKey();
    }

    /** OAuth 2.0 — find or create user from Google OIDC token payload */
    public User findOrCreateFromOAuth(String email, String name, String oauthProvider, String oauthId) {
        return userRepository.findByEmail(email).orElseGet(() -> userRepository.save(
            User.builder()
                .email(email)
                .name(name)
                .password(passwordEncoder.encode(UUID.randomUUID().toString())) // unusable password
                .role(Role.USER)
                .oauthProvider(oauthProvider)
                .oauthId(oauthId)
                .isPublicProfile(true)
                .build()
        ));
    }

    public void blockUser(String email, String userIdToBlock) {
        User user = getByEmail(email);
        if (user.getId().equals(userIdToBlock)) throw new RuntimeException("Cannot block yourself");
        if (!user.getBlockedUserIds().contains(userIdToBlock)) {
            user.getBlockedUserIds().add(userIdToBlock);
            userRepository.save(user);
        }
    }

    public void unblockUser(String email, String userIdToUnblock) {
        User user = getByEmail(email);
        user.getBlockedUserIds().remove(userIdToUnblock);
        userRepository.save(user);
    }

    public void reportUser(String email, String reportedUserId, String reason, String description) {
        User reporter = getByEmail(email);
        com.soulh.model.Report report = com.soulh.model.Report.builder()
                .reporterId(reporter.getId())
                .reportedUserId(reportedUserId)
                .reason(reason)
                .description(description)
                .build();
        report.onCreate();
        reportRepository.save(report);
    }
}
