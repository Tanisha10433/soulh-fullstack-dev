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

    public ConnectionRequest sendRequest(User sender, User receiver) {
        if (sender.getId().equals(receiver.getId()))
            throw new RuntimeException("Cannot connect with yourself.");
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
        return connectionRepo.findAcceptedForUser(user1.getId(), RequestStatus.ACCEPTED).stream()
                .anyMatch(r -> r.getSender().getId().equals(user2.getId()) ||
                               r.getReceiver().getId().equals(user2.getId()));
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
