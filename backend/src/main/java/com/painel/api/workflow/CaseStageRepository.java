package com.painel.api.workflow;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CaseStageRepository extends JpaRepository<CaseStage, UUID> {
    List<CaseStage> findByCaseFile_IdOrderByPositionAsc(UUID caseId);

    @Query("""
            select cs
            from CaseStage cs
            where cs.caseFile.id in :caseIds
            order by cs.caseFile.id asc, cs.position asc
            """)
    List<CaseStage> findByCaseFile_IdInOrderByCaseFile_IdAscPositionAsc(@Param("caseIds") List<UUID> caseIds);
}
