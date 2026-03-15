package com.painel.api.workflow;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CaseStageSubstepRepository extends JpaRepository<CaseStageSubstep, UUID> {
    List<CaseStageSubstep> findByStage_Id(UUID stageId);
    List<CaseStageSubstep> findByStage_IdOrderByPositionAsc(UUID stageId);

    @Query("""
            select css
            from CaseStageSubstep css
            join fetch css.stage stage
            where stage.id in :stageIds
            order by stage.id asc, css.position asc
            """)
    List<CaseStageSubstep> findByStage_IdInOrderByStage_IdAscPositionAsc(@Param("stageIds") List<UUID> stageIds);
}
