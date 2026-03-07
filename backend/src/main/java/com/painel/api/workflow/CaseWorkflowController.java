package com.painel.api.workflow;

import com.painel.api.user.OfficeUser;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping
public class CaseWorkflowController {

    private final CaseWorkflowService caseWorkflowService;

    public CaseWorkflowController(CaseWorkflowService caseWorkflowService) {
        this.caseWorkflowService = caseWorkflowService;
    }

    @GetMapping("/cases/{caseId}/stages")
    @ResponseStatus(HttpStatus.OK)
    public List<CaseStageResponse> listStages(
            @PathVariable UUID caseId,
            @AuthenticationPrincipal OfficeUser actor) {
        return caseWorkflowService.listStages(caseId, actor);
    }

    @PostMapping("/cases/{caseId}/stages")
    @ResponseStatus(HttpStatus.CREATED)
    public CaseStageResponse createStage(
            @PathVariable UUID caseId,
            @Valid @RequestBody CaseStageRequest request,
            @AuthenticationPrincipal OfficeUser actor) {
        return caseWorkflowService.createStage(caseId, request, actor);
    }

    @PatchMapping("/stages/{stageId}")
    @ResponseStatus(HttpStatus.OK)
    public CaseStageResponse updateStage(
            @PathVariable UUID stageId,
            @Valid @RequestBody CaseStageRequest request,
            @AuthenticationPrincipal OfficeUser actor) {
        return caseWorkflowService.updateStage(stageId, request, actor);
    }

    @GetMapping("/cases/{caseId}/tasks")
    @ResponseStatus(HttpStatus.OK)
    public List<CaseTaskResponse> listTasks(
            @PathVariable UUID caseId,
            @AuthenticationPrincipal OfficeUser actor) {
        return caseWorkflowService.listTasks(caseId, actor);
    }

    @PostMapping("/cases/{caseId}/tasks")
    @ResponseStatus(HttpStatus.CREATED)
    public CaseTaskResponse createTask(
            @PathVariable UUID caseId,
            @Valid @RequestBody CaseTaskRequest request,
            @AuthenticationPrincipal OfficeUser actor) {
        return caseWorkflowService.createTask(caseId, request, actor);
    }

    @PatchMapping("/tasks/{taskId}")
    @ResponseStatus(HttpStatus.OK)
    public CaseTaskResponse updateTask(
            @PathVariable UUID taskId,
            @Valid @RequestBody CaseTaskRequest request,
            @AuthenticationPrincipal OfficeUser actor) {
        return caseWorkflowService.updateTask(taskId, request, actor);
    }
}
