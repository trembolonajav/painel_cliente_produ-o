package com.painel.api.document;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentDownloadTokenRepository extends JpaRepository<DocumentDownloadToken, UUID> {
    Optional<DocumentDownloadToken> findByTokenHash(String tokenHash);
}
