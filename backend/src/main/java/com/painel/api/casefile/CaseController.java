package com.painel.api.casefile;

import com.painel.api.common.PagedResponse;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/cases")
public class CaseController {

    private final CaseService caseService;

    public CaseController(CaseService caseService) {
        this.caseService = caseService;
    }

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public PagedResponse<CaseResponse> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) CaseStatus status,
            @RequestParam(required = false) UUID clientId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal OfficeUser actor) {
        return caseService.list(search, status, clientId, page, size, actor);
    }

    @GetMapping("/dashboard")
    @ResponseStatus(HttpStatus.OK)
    public List<DashboardCaseResponse> listDashboard(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) CaseStatus status,
            @RequestParam(required = false) UUID clientId,
            @AuthenticationPrincipal OfficeUser actor) {
        return caseService.listDashboard(search, status, clientId, actor);
    }

    @GetMapping("/{id}")
    @ResponseStatus(HttpStatus.OK)
    public CaseResponse getById(
            @PathVariable UUID id,
            @AuthenticationPrincipal OfficeUser actor) {
        return caseService.getById(id, actor);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CaseResponse create(
            @Valid @RequestBody CaseRequest request,
            @AuthenticationPrincipal OfficeUser actor) {
        return caseService.create(request, actor);
    }

    @PatchMapping("/{id}")
    @ResponseStatus(HttpStatus.OK)
    public CaseResponse update(
            @PathVariable UUID id,
            @Valid @RequestBody CaseRequest request,
            @AuthenticationPrincipal OfficeUser actor) {
        return caseService.update(id, request, actor);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.OK)
    public CaseDeleteResponse delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal OfficeUser actor) {
        return caseService.delete(id, actor);
    }

    @GetMapping("/{id}/members")
    @ResponseStatus(HttpStatus.OK)
    public List<CaseMemberResponse> listMembers(
            @PathVariable UUID id,
            @AuthenticationPrincipal OfficeUser actor) {
        return caseService.listMembers(id, actor);
    }

    @PostMapping("/{id}/members")
    @ResponseStatus(HttpStatus.OK)
    public CaseMemberResponse upsertMember(
            @PathVariable UUID id,
            @Valid @RequestBody CaseMemberUpsertRequest request,
            @AuthenticationPrincipal OfficeUser actor) {
        return caseService.upsertMember(id, request, actor);
    }
}
