package com.painel.api.workflow;

import com.painel.api.auth.AuthorizationService;
import com.painel.api.audit.AuditActorType;
import com.painel.api.audit.AuditService;
import com.painel.api.casefile.CaseFile;
import com.painel.api.casefile.CaseFileRepository;
import com.painel.api.casefile.CaseStatusResolver;
import com.painel.api.common.NotFoundException;
import com.painel.api.user.OfficeUser;
import com.painel.api.user.OfficeUserRepository;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CaseWorkflowService {

    private final CaseStageRepository caseStageRepository;
    private final CaseStageSubstepRepository caseStageSubstepRepository;
    private final CaseTaskRepository caseTaskRepository;
    private final CaseFileRepository caseFileRepository;
    private final CaseStatusResolver caseStatusResolver;
    private final OfficeUserRepository officeUserRepository;
    private final AuthorizationService authorizationService;
    private final AuditService auditService;

    public CaseWorkflowService(
            CaseStageRepository caseStageRepository,
            CaseStageSubstepRepository caseStageSubstepRepository,
            CaseTaskRepository caseTaskRepository,
            CaseFileRepository caseFileRepository,
            CaseStatusResolver caseStatusResolver,
            OfficeUserRepository officeUserRepository,
            AuthorizationService authorizationService,
            AuditService auditService) {
        this.caseStageRepository = caseStageRepository;
        this.caseStageSubstepRepository = caseStageSubstepRepository;
        this.caseTaskRepository = caseTaskRepository;
        this.caseFileRepository = caseFileRepository;
        this.caseStatusResolver = caseStatusResolver;
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
        refreshCaseStatus(saved.getCaseFile());

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
        refreshCaseStatus(saved.getCaseFile());

        auditService.log(
                AuditActorType.OFFICE_USER,
                actor.getId(),
                "CASE_STAGE",
                saved.getId(),
                "UPDATE",
                Map.of("caseId", saved.getCaseFile().getId().toString(), "status", saved.getStatus().name()));
        return toStageResponse(saved);
    }

    @Transactional
    public List<CaseStageSubstepResponse> listSubsteps(UUID stageId, OfficeUser actor) {
        CaseStage stage = resolveStageById(stageId);
        authorizationService.requireCaseReadAccess(actor, stage.getCaseFile().getId());
        normalizeAndPersist(stageId);
        return loadSortedSubsteps(stageId).stream()
                .map(this::toSubstepResponse)
                .toList();
    }

    @Transactional
    public CaseStageSubstepResponse createSubstep(UUID stageId, CaseStageSubstepRequest request, OfficeUser actor) {
        CaseStage stage = resolveStageById(stageId);
        UUID caseId = stage.getCaseFile().getId();
        authorizationService.requireCaseWriteAccess(actor, caseId);

        CaseStageSubstep substep = new CaseStageSubstep();
        substep.setStage(stage);
        substep.setTitle(request.title().trim());
        substep.setDescription(normalizeDescription(request.description()));
        substep.setStatus(request.status());
        substep.setVisibleToClient(Boolean.TRUE.equals(request.visibleToClient()));

        List<CaseStageSubstep> orderedSubsteps = loadSortedSubsteps(stageId);
        orderedSubsteps.add(substep);
        normalizePositions(orderedSubsteps);
        CaseStageSubstep saved = saveAndGetSubstep(orderedSubsteps, substep);
        refreshCaseStatus(stage.getCaseFile());

        auditService.log(
                AuditActorType.OFFICE_USER,
                actor.getId(),
                "CASE_STAGE_SUBSTEP",
                saved.getId(),
                "CREATE",
                Map.of("caseId", caseId.toString(), "stageId", stageId.toString(), "title", saved.getTitle()));
        return toSubstepResponse(saved);
    }

    @Transactional
    public CaseStageSubstepResponse updateSubstep(UUID substepId, CaseStageSubstepRequest request, OfficeUser actor) {
        CaseStageSubstep substep = caseStageSubstepRepository.findById(substepId)
                .orElseThrow(() -> new NotFoundException("Subetapa nao encontrada"));
        UUID stageId = substep.getStage().getId();
        UUID caseId = substep.getStage().getCaseFile().getId();
        authorizationService.requireCaseWriteAccess(actor, caseId);

        List<CaseStageSubstep> orderedSubsteps = loadSortedSubsteps(stageId);
        CaseStageSubstep target = orderedSubsteps.stream()
                .filter(item -> item.getId().equals(substepId))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Subetapa nao encontrada"));

        target.setTitle(request.title().trim());
        target.setDescription(normalizeDescription(request.description()));
        target.setStatus(request.status());
        target.setVisibleToClient(Boolean.TRUE.equals(request.visibleToClient()));

        orderedSubsteps.remove(target);
        int desiredIndex = Math.max(0, request.position() - 1);
        int targetIndex = Math.min(desiredIndex, orderedSubsteps.size());
        orderedSubsteps.add(targetIndex, target);
        normalizePositions(orderedSubsteps);
        CaseStageSubstep saved = saveAndGetSubstep(orderedSubsteps, target);
        refreshCaseStatus(target.getStage().getCaseFile());

        auditService.log(
                AuditActorType.OFFICE_USER,
                actor.getId(),
                "CASE_STAGE_SUBSTEP",
                saved.getId(),
                "UPDATE",
                Map.of("caseId", caseId.toString(), "stageId", saved.getStage().getId().toString(), "status", saved.getStatus().name()));
        return toSubstepResponse(saved);
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

    @Transactional
    public void deleteStage(UUID stageId, OfficeUser actor) {
        CaseStage stage = caseStageRepository.findById(stageId)
                .orElseThrow(() -> new NotFoundException("Etapa nao encontrada"));
        UUID caseId = stage.getCaseFile().getId();
        authorizationService.requireCaseWriteAccess(actor, caseId);
        caseStageRepository.delete(stage);
        refreshCaseStatus(findCase(caseId));
        auditService.log(
                AuditActorType.OFFICE_USER,
                actor.getId(),
                "CASE_STAGE",
                stageId,
                "DELETE",
                Map.of("caseId", caseId.toString()));
    }

    @Transactional
    public void deleteTask(UUID taskId, OfficeUser actor) {
        CaseTask task = caseTaskRepository.findById(taskId)
                .orElseThrow(() -> new NotFoundException("Tarefa nao encontrada"));
        UUID caseId = task.getCaseFile().getId();
        authorizationService.requireCaseWriteAccess(actor, caseId);
        caseTaskRepository.delete(task);
        auditService.log(
                AuditActorType.OFFICE_USER,
                actor.getId(),
                "CASE_TASK",
                taskId,
                "DELETE",
                Map.of("caseId", caseId.toString()));
    }

    @Transactional
    public void deleteSubstep(UUID substepId, OfficeUser actor) {
        CaseStageSubstep substep = caseStageSubstepRepository.findById(substepId)
                .orElseThrow(() -> new NotFoundException("Subetapa nao encontrada"));
        UUID caseId = substep.getStage().getCaseFile().getId();
        UUID stageId = substep.getStage().getId();
        authorizationService.requireCaseWriteAccess(actor, caseId);
        caseStageSubstepRepository.delete(substep);
        normalizeAndPersist(stageId);
        refreshCaseStatus(findCase(caseId));
        auditService.log(
                AuditActorType.OFFICE_USER,
                actor.getId(),
                "CASE_STAGE_SUBSTEP",
                substepId,
                "DELETE",
                Map.of("caseId", caseId.toString(), "stageId", substep.getStage().getId().toString()));
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

    private CaseStage resolveStageById(UUID stageId) {
        return caseStageRepository.findById(stageId)
                .orElseThrow(() -> new NotFoundException("Etapa nao encontrada"));
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

    private CaseStageSubstepResponse toSubstepResponse(CaseStageSubstep substep) {
        return new CaseStageSubstepResponse(
                substep.getId(),
                substep.getStage().getId(),
                substep.getTitle(),
                substep.getDescription(),
                substep.getPosition(),
                substep.getStatus(),
                substep.isVisibleToClient(),
                substep.getCreatedAt(),
                substep.getUpdatedAt());
    }

    private String normalizeDescription(String description) {
        if (description == null) {
            return null;
        }
        String trimmed = description.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private List<CaseStageSubstep> loadSortedSubsteps(UUID stageId) {
        List<CaseStageSubstep> substeps = new ArrayList<>(caseStageSubstepRepository.findByStage_Id(stageId));
        substeps.sort(Comparator
                .comparingInt(CaseStageSubstep::getPosition)
                .thenComparing(CaseStageSubstep::getCreatedAt)
                .thenComparing(CaseStageSubstep::getId));
        return substeps;
    }

    private void normalizePositions(List<CaseStageSubstep> substeps) {
        for (int i = 0; i < substeps.size(); i++) {
            substeps.get(i).setPosition(i + 1);
        }
    }

    private CaseStageSubstep saveAndGetSubstep(List<CaseStageSubstep> substeps, CaseStageSubstep target) {
        List<CaseStageSubstep> saved = caseStageSubstepRepository.saveAll(substeps);
        return saved.stream()
                .filter(item -> item.getId().equals(target.getId()))
                .findFirst()
                .orElse(target);
    }

    private void normalizeAndPersist(UUID stageId) {
        List<CaseStageSubstep> substeps = loadSortedSubsteps(stageId);
        normalizePositions(substeps);
        caseStageSubstepRepository.saveAll(substeps);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void refreshCaseStatus(CaseFile caseFile) {
        caseStatusResolver.refresh(caseFile);
        caseFileRepository.save(caseFile);
    }
}
