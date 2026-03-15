package com.painel.api.casefile;

import com.painel.api.common.Visibility;
import com.painel.api.document.DocumentRepository;
import com.painel.api.document.DocumentStatus;
import com.painel.api.workflow.CaseStage;
import com.painel.api.workflow.CaseStageRepository;
import com.painel.api.workflow.CaseStageStatus;
import com.painel.api.workflow.CaseStageSubstep;
import com.painel.api.workflow.CaseStageSubstepRepository;
import com.painel.api.workflow.CaseStageSubstepStatus;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class CaseStatusResolver {

    private final CaseStageRepository caseStageRepository;
    private final CaseStageSubstepRepository caseStageSubstepRepository;
    private final DocumentRepository documentRepository;

    public CaseStatusResolver(
            CaseStageRepository caseStageRepository,
            CaseStageSubstepRepository caseStageSubstepRepository,
            DocumentRepository documentRepository) {
        this.caseStageRepository = caseStageRepository;
        this.caseStageSubstepRepository = caseStageSubstepRepository;
        this.documentRepository = documentRepository;
    }

    public void refresh(CaseFile caseFile) {
        CaseStatus nextStatus = resolve(caseFile.getId());
        if (caseFile.getStatus() == nextStatus) {
            return;
        }
        caseFile.setStatus(nextStatus);
        if (nextStatus == CaseStatus.CLOSED && caseFile.getClosedAt() == null) {
            caseFile.setClosedAt(OffsetDateTime.now());
        } else if (nextStatus != CaseStatus.CLOSED) {
            caseFile.setClosedAt(null);
        }
    }

    public CaseStatus resolve(UUID caseId) {
        List<CaseStage> stages = caseStageRepository.findByCaseFile_IdOrderByPositionAsc(caseId);
        if (stages.isEmpty()) {
            return resolveStatusWithoutWorkflow(caseId);
        }

        List<UUID> stageIds = stages.stream().map(CaseStage::getId).toList();
        List<CaseStageSubstep> substeps = stageIds.isEmpty()
                ? List.of()
                : caseStageSubstepRepository.findByStage_IdInOrderByStage_IdAscPositionAsc(stageIds);

        Map<UUID, int[]> progressByStage = new HashMap<>();
        for (CaseStageSubstep substep : substeps) {
            int[] progress = progressByStage.computeIfAbsent(substep.getStage().getId(), ignored -> new int[2]);
            progress[0] += 1;
            if (substep.getStatus() == CaseStageSubstepStatus.DONE) {
                progress[1] += 1;
            }
        }

        int totalUnits = 0;
        int completedUnits = 0;
        for (CaseStage stage : stages) {
            int[] progress = progressByStage.get(stage.getId());
            if (progress != null && progress[0] > 0) {
                totalUnits += progress[0];
                completedUnits += progress[1];
            } else {
                totalUnits += 1;
                if (stage.getStatus() == CaseStageStatus.DONE) {
                    completedUnits += 1;
                }
            }
        }

        if (totalUnits > 0 && completedUnits == totalUnits) {
            return CaseStatus.CLOSED;
        }

        return resolveStatusWithoutWorkflow(caseId);
    }

    private CaseStatus resolveStatusWithoutWorkflow(UUID caseId) {
        boolean waitingClient = documentRepository.existsByCaseFile_IdAndVisibilityAndStatus(
                caseId,
                Visibility.CLIENT_VISIBLE,
                DocumentStatus.PENDING);
        if (waitingClient) {
            return CaseStatus.WAITING_CLIENT;
        }
        return CaseStatus.IN_PROGRESS;
    }
}
