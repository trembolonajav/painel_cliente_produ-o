package com.painel.api.workflow;

import com.painel.api.auth.AuthorizationService;
import com.painel.api.audit.AuditActorType;
import com.painel.api.audit.AuditService;
import com.painel.api.casefile.CaseFile;
import com.painel.api.casefile.CaseFileRepository;
import com.painel.api.common.NotFoundException;
import com.painel.api.user.OfficeUser;
import com.painel.api.user.OfficeUserRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CaseWorkflowService {

    private final CaseStageRepository caseStageRepository;
    private final CaseTaskRepository caseTaskRepository;
    private final CaseFileRepository caseFileRepository;
    private final OfficeUserRepository officeUserRepository;
    private final AuthorizationService authorizationService;
    private final AuditService auditService;

    public CaseWorkflowService(
            CaseStageRepository caseStageRepository,
            CaseTaskRepository caseTaskRepository,
            CaseFileRepository caseFileRepository,
            OfficeUserRepository officeUserRepository,
            AuthorizationService authorizationService,
            AuditService auditService) {
        this.caseStageRepository = caseStageRepository;
        this.caseTaskRepository = caseTaskRepository;
        this.caseFileRepository = caseFileRepository;
        this.officeUserRepository = officeUserRepository;
        this.authorizationService = authorizationService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<CaseStageResponse> listStages(UUID caseId, OfficeUser actor) {
        authorizationService.requireCaseReadAccess(actor, caseId);
        return caseStageRepository.findByCaseFile_IdOrderByPositionAsc(caseId).stream()
                .map(this::toStageResponse)
                .toList();
    }

    @Transactional
    public CaseStageResponse createStage(UUID caseId, CaseStageRequest request, OfficeUser actor) {
        authorizationService.requireCaseWriteAccess(actor, caseId);
        CaseFile caseFile = findCase(caseId);

        CaseStage stage = new CaseStage();
        stage.setCaseFile(caseFile);
        applyStage(stage, request);
        CaseStage saved = caseStageRepository.save(stage);

        auditService.log(
                AuditActorType.OFFICE_USER,
                actor.getId(),
                "CASE_STAGE",
                saved.getId(),
                "CREATE",
                Map.of("caseId", caseId.toString(), "title", saved.getTitle()));
        return toStageResponse(saved);
    }

    @Transactional
    public CaseStageResponse updateStage(UUID stageId, CaseStageRequest request, OfficeUser actor) {
        CaseStage stage = caseStageRepository.findById(stageId)
                .orElseThrow(() -> new NotFoundException("Etapa nao encontrada"));
        authorizationService.requireCaseWriteAccess(actor, stage.getCaseFile().getId());
        applyStage(stage, request);
        CaseStage saved = caseStageRepository.save(stage);

        auditService.log(
                AuditActorType.OFFICE_USER,
                actor.getId(),
                "CASE_STAGE",
                saved.getId(),
                "UPDATE",
                Map.of("caseId", saved.getCaseFile().getId().toString(), "status", saved.getStatus().name()));
        return toStageResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<CaseTaskResponse> listTasks(UUID caseId, OfficeUser actor) {
        authorizationService.requireCaseReadAccess(actor, caseId);
        return caseTaskRepository.findByCaseFile_IdOrderByCreatedAtDesc(caseId).stream()
                .map(this::toTaskResponse)
                .toList();
    }

    @Transactional
    public CaseTaskResponse createTask(UUID caseId, CaseTaskRequest request, OfficeUser actor) {
        authorizationService.requireCaseWriteAccess(actor, caseId);
        CaseFile caseFile = findCase(caseId);

        CaseTask task = new CaseTask();
        task.setCaseFile(caseFile);
        task.setCreatedBy(actor);
        applyTask(task, request);
        CaseTask saved = caseTaskRepository.save(task);

        auditService.log(
                AuditActorType.OFFICE_USER,
                actor.getId(),
                "CASE_TASK",
                saved.getId(),
                "CREATE",
                Map.of("caseId", caseId.toString(), "title", saved.getTitle(), "status", saved.getStatus().name()));
        return toTaskResponse(saved);
    }

    @Transactional
    public CaseTaskResponse updateTask(UUID taskId, CaseTaskRequest request, OfficeUser actor) {
        CaseTask task = caseTaskRepository.findById(taskId)
                .orElseThrow(() -> new NotFoundException("Tarefa nao encontrada"));
        authorizationService.requireCaseWriteAccess(actor, task.getCaseFile().getId());
        applyTask(task, request);
        CaseTask saved = caseTaskRepository.save(task);

        auditService.log(
                AuditActorType.OFFICE_USER,
                actor.getId(),
                "CASE_TASK",
                saved.getId(),
                "UPDATE",
                Map.of("caseId", saved.getCaseFile().getId().toString(), "status", saved.getStatus().name()));
        return toTaskResponse(saved);
    }

    private CaseFile findCase(UUID caseId) {
        return caseFileRepository.findById(caseId)
                .orElseThrow(() -> new NotFoundException("Caso nao encontrado"));
    }

    private void applyStage(CaseStage stage, CaseStageRequest request) {
        stage.setTitle(request.title().trim());
        stage.setDescription(trimToNull(request.description()));
        stage.setPosition(request.position());
        stage.setStatus(request.status());
    }

    private void applyTask(CaseTask task, CaseTaskRequest request) {
        task.setTitle(request.title().trim());
        task.setDescription(trimToNull(request.description()));
        task.setDueDate(request.dueDate());
        task.setStatus(request.status());
        task.setStage(resolveStage(task.getCaseFile().getId(), request.stageId()));
        task.setAssignedTo(resolveUser(request.assignedTo()));

        if (request.status() == CaseTaskStatus.DONE) {
            if (task.getCompletedAt() == null) {
                task.setCompletedAt(OffsetDateTime.now());
            }
        } else {
            task.setCompletedAt(null);
        }
    }

    private CaseStage resolveStage(UUID caseId, UUID stageId) {
        if (stageId == null) {
            return null;
        }
        CaseStage stage = caseStageRepository.findById(stageId)
                .orElseThrow(() -> new NotFoundException("Etapa da tarefa nao encontrada"));
        if (!stage.getCaseFile().getId().equals(caseId)) {
            throw new NotFoundException("Etapa nao pertence ao caso");
        }
        return stage;
    }

    private OfficeUser resolveUser(UUID userId) {
        if (userId == null) {
            return null;
        }
        return officeUserRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario atribuido nao encontrado"));
    }

    private CaseStageResponse toStageResponse(CaseStage stage) {
        return new CaseStageResponse(
                stage.getId(),
                stage.getCaseFile().getId(),
                stage.getTitle(),
                stage.getDescription(),
                stage.getPosition(),
                stage.getStatus(),
                stage.getCreatedAt(),
                stage.getUpdatedAt());
    }

    private CaseTaskResponse toTaskResponse(CaseTask task) {
        return new CaseTaskResponse(
                task.getId(),
                task.getCaseFile().getId(),
                task.getStage() == null ? null : task.getStage().getId(),
                task.getTitle(),
                task.getDescription(),
                task.getDueDate(),
                task.getStatus(),
                task.getAssignedTo() == null ? null : task.getAssignedTo().getId(),
                task.getAssignedTo() == null ? null : task.getAssignedTo().getName(),
                task.getCreatedBy().getId(),
                task.getCreatedBy().getName(),
                task.getCreatedAt(),
                task.getUpdatedAt(),
                task.getCompletedAt());
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
