package com.painel.api.portal;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClientPortalSessionRepository extends JpaRepository<ClientPortalSession, UUID> {
    Optional<ClientPortalSession> findBySessionHash(String sessionHash);
}
