package com.soulh.service;

import com.soulh.dto.AuthResponse;
import com.soulh.dto.LoginRequest;
import com.soulh.dto.RegisterRequest;
import com.soulh.model.User;
import com.soulh.repository.UserRepository;
import com.soulh.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * AuthService - Handles register and login logic.
 *
 * Register: save user with hashed password → return JWT
 * Login: verify credentials → return JWT
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final com.soulh.repository.DoctorVerificationRepository doctorVerificationRepository;
    private final RefreshTokenService refreshTokenService;

    public AuthResponse register(RegisterRequest request) {
        String email = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : null;
        if (email != null && userRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("Email already registered.");
        }

        User user = User.builder()
                .name(request.getName())
                .email(email)
                .password(passwordEncoder.encode(request.getPassword())) // BCrypt hash!
                .role(request.getRole())
                .illnessCondition(request.getIllnessCondition())
                .experience(request.getExperience())
                .qualification(request.getQualification())
                .hospital(request.getHospital())
                .isPublicProfile(true)
                .build();

        userRepository.save(user);

        if (com.soulh.model.Role.DOCTOR.equals(request.getRole()) && request.getRegistrationNumber() != null) {
            com.soulh.model.DoctorVerification verification = com.soulh.model.DoctorVerification.builder()
                .doctor(user)
                .registrationNumber(request.getRegistrationNumber())
                .status(com.soulh.model.VerificationStatus.PENDING)
                .build();
            doctorVerificationRepository.save(verification);
        }

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String token = jwtUtil.generateToken(userDetails);
        String refreshToken = refreshTokenService.createRefreshToken(user.getId()).getToken();

        return AuthResponse.builder()
                .token(token)
                .refreshToken(refreshToken)
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        String email = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : null;
        // This throws BadCredentialsException if email/password don't match
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, request.getPassword())
        );

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found."));

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String token = jwtUtil.generateToken(userDetails);
        
        // Delete old token and create new one
        refreshTokenService.deleteByUserId(user.getId());
        String refreshToken = refreshTokenService.createRefreshToken(user.getId()).getToken();

        return AuthResponse.builder()
                .token(token)
                .refreshToken(refreshToken)
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }
}
