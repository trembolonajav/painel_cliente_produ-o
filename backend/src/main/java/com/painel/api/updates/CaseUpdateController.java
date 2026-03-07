package com.painel.api.updates;

import com.painel.api.user.OfficeUser;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/cases/{caseId}/updates")
public class CaseUpdateController {

    private final CaseUpdateService caseUpdateService;

    public CaseUpdateController(CaseUpdateService caseUpdateService) {
        this.caseUpdateService = caseUpdateService;
    }

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<CaseUpdateResponse> listForStaff(
            @PathVariable UUID caseId,
            @AuthenticationPrincipal OfficeUser actor) {
        return caseUpdateService.listForStaff(caseId, actor);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CaseUpdateResponse create(
            @PathVariable UUID caseId,
            @Valid @RequestBody CaseUpdateRequest request,
            @AuthenticationPrincipal OfficeUser actor) {
        return caseUpdateService.create(caseId, request, actor);
    }

    @DeleteMapping("/{updateId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable UUID caseId,
            @PathVariable UUID updateId,
            @AuthenticationPrincipal OfficeUser actor) {
        caseUpdateService.delete(caseId, updateId, actor);
    }
}
