package com.painel.api.auth;

import com.painel.api.audit.AuditActorType;
import com.painel.api.audit.AuditService;
import com.painel.api.user.OfficeUser;
import com.painel.api.user.OfficeUserRepository;
import java.time.OffsetDateTime;
import java.util.Map;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final OfficeUserRepository officeUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuditService auditService;

    public AuthService(OfficeUserRepository officeUserRepository, PasswordEncoder passwordEncoder, JwtService jwtService, AuditService auditService) {
        this.officeUserRepository = officeUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.auditService = auditService;
    }

    public AuthResponse login(LoginRequest request) {
        OfficeUser user = officeUserRepository.findByEmail(request.email().toLowerCase())
                .orElseThrow(() -> new BadCredentialsException("Credenciais invalidas"));

        if (!user.isActive() || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Credenciais invalidas");
        }

        user.setLastLoginAt(OffsetDateTime.now());
        officeUserRepository.save(user);
        auditService.log(
                AuditActorType.OFFICE_USER,
                user.getId(),
                "AUTH",
                user.getId(),
                "LOGIN_SUCCESS",
                Map.of("email", user.getEmail()));

        String token = jwtService.generateAccessToken(user.getId(), user.getRole().name());
        return new AuthResponse(token, user.getId(), user.getName(), user.getEmail(), user.getRole());
    }

    public MeResponse me(OfficeUser user) {
        return new MeResponse(user.getId(), user.getName(), user.getEmail(), user.getRole());
    }
}
