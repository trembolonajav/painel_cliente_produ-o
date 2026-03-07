package com.painel.api.workflow;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CaseStageRepository extends JpaRepository<CaseStage, UUID> {
    List<CaseStage> findByCaseFile_IdOrderByPositionAsc(UUID caseId);
}
