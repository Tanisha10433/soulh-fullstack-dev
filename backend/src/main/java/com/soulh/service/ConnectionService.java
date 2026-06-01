package com.soulh.service;

import com.soulh.model.ConnectionRequest;
import com.soulh.model.RequestStatus;
import com.soulh.model.User;
import com.soulh.repository.ConnectionRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ConnectionService {

    private final ConnectionRequestRepository connectionRepo;
    private final NotificationService notificationService;
    private final com.soulh.repository.ConsultationRepository consultationRepo;
    private final com.soulh.repository.ConsultationRequestRepository consultationRequestRepo;

    public ConnectionRequest sendRequest(User sender, User receiver) {
        if (sender.getId().equals(receiver.getId()))
            throw new RuntimeException("Cannot connect with yourself.");
        if (!com.soulh.model.Role.USER.equals(sender.getRole()) || !com.soulh.model.Role.USER.equals(receiver.getRole()))
            throw new RuntimeException("Peer connections are limited to normal users (members) only.");
        if (connectionRepo.existsBySenderAndReceiver(sender, receiver))
            throw new RuntimeException("Request already sent.");

        ConnectionRequest saved = connectionRepo.save(ConnectionRequest.builder()
                .sender(sender)
                .receiver(receiver)
                .status(RequestStatus.PENDING)
                .build());

        notificationService.createAndSend(
            receiver, 
            sender.getName() + " sent you a connection request.", 
            "CONNECTION_REQUEST"
        );

        return saved;
    }

    // Single JOIN FETCH query — no N+1
    public List<ConnectionRequest> getPendingRequests(User receiver) {
        return connectionRepo.findPendingForUser(receiver.getId(), RequestStatus.PENDING);
    }

    // Single JOIN FETCH query — no N+1
    public List<ConnectionRequest> getAcceptedConnections(User user) {
        return connectionRepo.findAcceptedForUser(user.getId(), RequestStatus.ACCEPTED);
    }

    public boolean areConnected(User user1, User user2) {
        // If both are normal users, check peer connection request status
        if (com.soulh.model.Role.USER.equals(user1.getRole()) && com.soulh.model.Role.USER.equals(user2.getRole())) {
            return connectionRepo.findAcceptedForUser(user1.getId(), RequestStatus.ACCEPTED).stream()
                    .anyMatch(r -> r.getSender().getId().equals(user2.getId()) ||
                                   r.getReceiver().getId().equals(user2.getId()));
        }
        
        // If one is doctor, they can only chat if they have a confirmed consultation
        return hasActiveConsultation(user1.getId(), user2.getId());
    }

    private boolean hasActiveConsultation(String userId1, String userId2) {
        try {
            // Check confirmed/completed consultations (booked via slot)
            List<String> activeStatuses = List.of("CONFIRMED", "COMPLETED");
            if (consultationRepo.existsByPatientIdAndDoctorIdAndStatusIn(userId1, userId2, activeStatuses) ||
                consultationRepo.existsByPatientIdAndDoctorIdAndStatusIn(userId2, userId1, activeStatuses)) {
                return true;
            }
            // Also check consultation requests (PENDING or ACCEPTED)
            // This lets users message doctors once they've submitted a request
            List<String> requestStatuses = List.of("PENDING", "ACCEPTED", "CONFIRMED");
            return consultationRequestRepo.existsByPatientIdAndDoctorIdAndStatusIn(userId1, userId2, requestStatuses) ||
                   consultationRequestRepo.existsByPatientIdAndDoctorIdAndStatusIn(userId2, userId1, requestStatuses);
        } catch (Exception e) {
            return false;
        }
    }

    public ConnectionRequest respond(String requestId, User me, String action) {
        ConnectionRequest req = connectionRepo.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));
        if (!req.getReceiver().getId().equals(me.getId()))
            throw new RuntimeException("Not authorized to respond to this request");
        
        boolean isAccept = "ACCEPT".equalsIgnoreCase(action);
        req.setStatus(isAccept ? RequestStatus.ACCEPTED : RequestStatus.REJECTED);
        ConnectionRequest saved = connectionRepo.save(req);

        if (isAccept) {
            notificationService.createAndSend(
                req.getSender(), 
                me.getName() + " accepted your connection request!", 
                "REQUEST_ACCEPTED"
            );
        }

        return saved;
    }
}
