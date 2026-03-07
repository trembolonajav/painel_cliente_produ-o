package com.painel.api.updates;

import com.painel.api.common.Visibility;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CaseUpdateRepository extends JpaRepository<CaseUpdate, UUID> {
    List<CaseUpdate> findByCaseFile_IdOrderByCreatedAtDesc(UUID caseId);
    List<CaseUpdate> findByCaseFile_IdAndVisibilityOrderByCreatedAtDesc(UUID caseId, Visibility visibility);
}
