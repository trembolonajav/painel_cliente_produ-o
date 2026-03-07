package com.painel.api.portal;

import com.painel.api.user.OfficeUser;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/cases/{caseId}/portal-link")
public class PortalLinkController {

    private final PortalLinkService portalLinkService;

    public PortalLinkController(PortalLinkService portalLinkService) {
        this.portalLinkService = portalLinkService;
    }

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public PortalLinkResponse status(
            @PathVariable UUID caseId,
            @AuthenticationPrincipal OfficeUser actor) {
        return portalLinkService.getStatus(caseId, actor);
    }

    @PostMapping("/activate")
    @ResponseStatus(HttpStatus.OK)
    public PortalLinkResponse activate(
            @PathVariable UUID caseId,
            @Valid @RequestBody(required = false) PortalLinkActivateRequest request,
            @AuthenticationPrincipal OfficeUser actor) {
        return portalLinkService.activate(caseId, request, actor);
    }

    @PostMapping("/revoke")
    @ResponseStatus(HttpStatus.OK)
    public PortalLinkResponse revoke(
            @PathVariable UUID caseId,
            @AuthenticationPrincipal OfficeUser actor) {
        return portalLinkService.revoke(caseId, actor);
    }
}
