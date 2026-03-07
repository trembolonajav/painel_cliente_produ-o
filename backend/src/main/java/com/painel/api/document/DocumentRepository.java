package com.painel.api.document;

import com.painel.api.common.Visibility;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentRepository extends JpaRepository<Document, UUID> {
    List<Document> findByCaseFile_IdOrderByCreatedAtDesc(UUID caseId);
    List<Document> findByCaseFile_IdAndVisibilityOrderByCreatedAtDesc(UUID caseId, Visibility visibility);
    List<Document> findByCaseFile_IdAndVisibilityAndStatusOrderByCreatedAtDesc(UUID caseId, Visibility visibility, DocumentStatus status);
    long countByUploadedBy_Id(UUID userId);
}
