package com.painel.api.portal;

import com.painel.api.document.DocumentDownloadLinkResponse;
import com.painel.api.document.DocumentDownloadService;
import com.painel.api.document.DocumentResponse;
import com.painel.api.updates.CaseUpdateResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/client-portal")
public class ClientPortalReadController {

    private final ClientPortalReadService clientPortalReadService;
    private final DocumentDownloadService documentDownloadService;

    public ClientPortalReadController(
            ClientPortalReadService clientPortalReadService,
            DocumentDownloadService documentDownloadService) {
        this.clientPortalReadService = clientPortalReadService;
        this.documentDownloadService = documentDownloadService;
    }

    @GetMapping("/updates")
    @ResponseStatus(HttpStatus.OK)
    public List<CaseUpdateResponse> updates(HttpServletRequest request) {
        return clientPortalReadService.listVisibleUpdates(request);
    }

    @GetMapping("/bootstrap")
    @ResponseStatus(HttpStatus.OK)
    public ClientPortalBootstrapResponse bootstrap(HttpServletRequest request) {
        return clientPortalReadService.bootstrap(request);
    }

    @GetMapping("/documents")
    @ResponseStatus(HttpStatus.OK)
    public List<DocumentResponse> documents(HttpServletRequest request) {
        return clientPortalReadService.listVisibleDocuments(request);
    }

    @GetMapping("/stages")
    @ResponseStatus(HttpStatus.OK)
    public List<ClientPortalStageResponse> stages(HttpServletRequest request) {
        return clientPortalReadService.listStages(request);
    }

    @GetMapping("/patrimony")
    @ResponseStatus(HttpStatus.OK)
    public ClientPortalPatrimonyResponse patrimony(HttpServletRequest request) {
        return clientPortalReadService.getVisiblePatrimony(request);
    }

    @PostMapping("/patrimony/original-document/download-link")
    @ResponseStatus(HttpStatus.OK)
    public ClientPortalPatrimonyOriginalDocumentResponse patrimonyOriginalDocumentDownloadLink(HttpServletRequest request) {
        return clientPortalReadService.getPatrimonyOriginalDocumentDownloadLink(request);
    }

    @PostMapping("/documents/{documentId}/download-link")
    @ResponseStatus(HttpStatus.OK)
    public DocumentDownloadLinkResponse documentDownloadLink(
            @PathVariable UUID documentId,
            HttpServletRequest request) {
        return documentDownloadService.createClientDownloadLink(documentId, request);
    }
}
