package com.painel.api.patrimony;

import com.painel.api.document.DocumentPresignResponse;
import com.painel.api.user.OfficeUser;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
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
public class PatrimonyController {

    private final PatrimonyService patrimonyService;

    public PatrimonyController(PatrimonyService patrimonyService) {
        this.patrimonyService = patrimonyService;
    }

    @GetMapping("/cases/{caseId}/patrimony/structure")
    @ResponseStatus(HttpStatus.OK)
    public PatrimonyStructureResponse getByCaseId(
            @PathVariable UUID caseId,
            @AuthenticationPrincipal OfficeUser actor) {
        return patrimonyService.getByCaseId(caseId, actor);
    }

    @PostMapping("/cases/{caseId}/patrimony/structure")
    @ResponseStatus(HttpStatus.CREATED)
    public PatrimonyStructureResponse create(
            @PathVariable UUID caseId,
            @Valid @RequestBody PatrimonyStructureCreateRequest request,
            @AuthenticationPrincipal OfficeUser actor) {
        return patrimonyService.create(caseId, request, actor);
    }

    @PatchMapping("/patrimony/structures/{structureId}")
    @ResponseStatus(HttpStatus.OK)
    public PatrimonyStructureResponse update(
            @PathVariable UUID structureId,
            @Valid @RequestBody PatrimonyStructureUpdateRequest request,
            @AuthenticationPrincipal OfficeUser actor) {
        return patrimonyService.update(structureId, request, actor);
    }

    @GetMapping("/patrimony/structures/{structureId}/nodes")
    @ResponseStatus(HttpStatus.OK)
    public List<PatrimonyNodeResponse> listNodes(
            @PathVariable UUID structureId,
            @AuthenticationPrincipal OfficeUser actor) {
        return patrimonyService.listNodes(structureId, actor);
    }

    @PostMapping("/patrimony/structures/{structureId}/nodes")
    @ResponseStatus(HttpStatus.CREATED)
    public PatrimonyNodeResponse createNode(
            @PathVariable UUID structureId,
            @Valid @RequestBody PatrimonyNodeRequest request,
            @AuthenticationPrincipal OfficeUser actor) {
        return patrimonyService.createNode(structureId, request, actor);
    }

    @PatchMapping("/patrimony/nodes/{nodeId}")
    @ResponseStatus(HttpStatus.OK)
    public PatrimonyNodeResponse updateNode(
            @PathVariable UUID nodeId,
            @Valid @RequestBody PatrimonyNodeRequest request,
            @AuthenticationPrincipal OfficeUser actor) {
        return patrimonyService.updateNode(nodeId, request, actor);
    }

    @DeleteMapping("/patrimony/nodes/{nodeId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteNode(
            @PathVariable UUID nodeId,
            @AuthenticationPrincipal OfficeUser actor) {
        patrimonyService.deleteNode(nodeId, actor);
    }

    @PostMapping("/patrimony/structures/{structureId}/original-document/presign")
    @ResponseStatus(HttpStatus.OK)
    public DocumentPresignResponse presignOriginalDocument(
            @PathVariable UUID structureId,
            @Valid @RequestBody PatrimonyOriginalDocPresignRequest request,
            @AuthenticationPrincipal OfficeUser actor) {
        return patrimonyService.presignOriginalDocument(structureId, request, actor);
    }

    @PostMapping("/patrimony/structures/{structureId}/original-document/download-link")
    @ResponseStatus(HttpStatus.OK)
    public PatrimonyDownloadLinkResponse originalDocumentDownloadLink(
            @PathVariable UUID structureId,
            @AuthenticationPrincipal OfficeUser actor) {
        return patrimonyService.getOriginalDocumentDownloadLink(structureId, actor);
    }
}
