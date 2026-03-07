package com.painel.api.portal;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CasePortalLinkRepository extends JpaRepository<CasePortalLink, UUID> {
    Optional<CasePortalLink> findFirstByCaseFile_IdAndStatusOrderByCreatedAtDesc(UUID caseId, PortalLinkStatus status);
    List<CasePortalLink> findByCaseFile_IdAndStatus(UUID caseId, PortalLinkStatus status);
    Optional<CasePortalLink> findFirstByCaseFile_IdOrderByCreatedAtDesc(UUID caseId);
    Optional<CasePortalLink> findByTokenHash(String tokenHash);
}
