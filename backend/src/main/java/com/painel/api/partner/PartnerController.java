package com.painel.api.partner;

import com.painel.api.common.PagedResponse;
import com.painel.api.user.OfficeUser;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/partners")
public class PartnerController {

    private final PartnerService partnerService;

    public PartnerController(PartnerService partnerService) {
        this.partnerService = partnerService;
    }

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public PagedResponse<PartnerListItemResponse> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal OfficeUser actor) {
        return partnerService.list(page, size, actor);
    }

    @GetMapping("/{id}")
    @ResponseStatus(HttpStatus.OK)
    public PartnerResponse getById(
            @PathVariable UUID id,
            @AuthenticationPrincipal OfficeUser actor) {
        return partnerService.getById(id, actor);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PartnerResponse create(
            @Valid @RequestBody PartnerRequest request,
            @AuthenticationPrincipal OfficeUser actor) {
        return partnerService.create(request, actor);
    }

    @PutMapping("/{id}")
    @ResponseStatus(HttpStatus.OK)
    public PartnerResponse update(
            @PathVariable UUID id,
            @Valid @RequestBody PartnerRequest request,
            @AuthenticationPrincipal OfficeUser actor) {
        return partnerService.update(id, request, actor);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.OK)
    public PartnerDeleteResponse delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal OfficeUser actor) {
        return partnerService.delete(id, actor);
    }
}
