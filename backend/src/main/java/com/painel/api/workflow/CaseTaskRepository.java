package com.painel.api.workflow;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CaseTaskRepository extends JpaRepository<CaseTask, UUID> {
    List<CaseTask> findByCaseFile_IdOrderByCreatedAtDesc(UUID caseId);
    long countByCreatedBy_Id(UUID userId);
    long countByAssignedTo_Id(UUID userId);
}
