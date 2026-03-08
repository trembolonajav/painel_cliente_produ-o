package com.painel.api.workflow;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CaseStageSubstepRepository extends JpaRepository<CaseStageSubstep, UUID> {
    List<CaseStageSubstep> findByStage_Id(UUID stageId);
    List<CaseStageSubstep> findByStage_IdOrderByPositionAsc(UUID stageId);
}
