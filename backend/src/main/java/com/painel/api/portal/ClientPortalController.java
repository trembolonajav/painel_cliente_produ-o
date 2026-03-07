package com.painel.api.portal;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/client-portal")
public class ClientPortalController {

    private final ClientPortalSessionService clientPortalSessionService;

    public ClientPortalController(ClientPortalSessionService clientPortalSessionService) {
        this.clientPortalSessionService = clientPortalSessionService;
    }

    @PostMapping("/session")
    @ResponseStatus(HttpStatus.OK)
    public ClientPortalSessionResponse createSession(
            @Valid @RequestBody ClientPortalSessionRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        return clientPortalSessionService.createSession(request, httpRequest, httpResponse);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        clientPortalSessionService.logout(request, response);
    }

    @GetMapping("/me")
    @ResponseStatus(HttpStatus.OK)
    public ClientPortalMeResponse me(HttpServletRequest request) {
        return clientPortalSessionService.me(request);
    }

    @GetMapping("/case")
    @ResponseStatus(HttpStatus.OK)
    public ClientPortalCaseResponse caseDetails(HttpServletRequest request) {
        return clientPortalSessionService.caseDetails(request);
    }
}
