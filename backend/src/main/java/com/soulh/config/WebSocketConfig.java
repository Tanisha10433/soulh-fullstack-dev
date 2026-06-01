package com.soulh.config;

import com.soulh.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * WebSocketConfig — Enables real-time chat via STOMP/SockJS.
 *
 * Security: JWT is validated on STOMP CONNECT so that Principal is set
 *           for all subsequent @MessageMapping calls.
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;
    private final com.soulh.repository.UserRepository userRepository;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")   // allow localhost:3000 and localhost:5173
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
        config.setUserDestinationPrefix("/user");
    }

    /**
     * Channel interceptor — validates JWT from STOMP CONNECT headers
     * and sets Principal so @MessageMapping methods receive it correctly.
     */
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor =
                    MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String authHeader = accessor.getFirstNativeHeader("Authorization");
                    if (authHeader != null && authHeader.startsWith("Bearer ")) {
                        String token = authHeader.substring(7);
                        try {
                            String username = jwtUtil.extractEmail(token);
                            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                            if (jwtUtil.isTokenValid(token, userDetails)) {
                                com.soulh.model.User user = userRepository.findByEmail(username)
                                        .orElseThrow(() -> new RuntimeException("User not found"));
                                UsernamePasswordAuthenticationToken auth =
                                    new UsernamePasswordAuthenticationToken(
                                        user.getId(), null, userDetails.getAuthorities());
                                accessor.setUser(auth);
                            }
                        } catch (Exception e) {
                            // Invalid token — connection proceeds as anonymous
                            // (ChatController checks principal != null and rejects)
                        }
                    }
                }
                return message;
            }
        });
    }
}
