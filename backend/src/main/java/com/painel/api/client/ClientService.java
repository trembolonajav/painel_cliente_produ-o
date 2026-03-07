package com.painel.api.client;

import com.painel.api.auth.AuthorizationService;
import com.painel.api.audit.AuditActorType;
import com.painel.api.audit.AuditService;
import com.painel.api.common.NotFoundException;
import com.painel.api.user.OfficeRole;
import com.painel.api.user.OfficeUser;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ClientService {

    private final ClientRepository clientRepository;
    private final AuthorizationService authorizationService;
    private final AuditService auditService;

    public ClientService(ClientRepository clientRepository, AuthorizationService authorizationService, AuditService auditService) {
        this.clientRepository = clientRepository;
        this.authorizationService = authorizationService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<ClientResponse> list(String search, OfficeUser actor) {
        authorizationService.requireAnyRole(actor, OfficeRole.ADMIN, OfficeRole.LAWYER, OfficeRole.ASSISTANT, OfficeRole.VIEWER);
        String normalizedSearch = normalizeFilter(search);
        List<Client> clients = normalizedSearch == null
                ? clientRepository.findAllByOrderByUpdatedAtDesc()
                : clientRepository.search(normalizedSearch);
        return clients.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ClientResponse getById(UUID id, OfficeUser actor) {
        authorizationService.requireAnyRole(actor, OfficeRole.ADMIN, OfficeRole.LAWYER, OfficeRole.ASSISTANT, OfficeRole.VIEWER);
        return toResponse(findClient(id));
    }

    @Transactional
    public ClientResponse create(ClientRequest request, OfficeUser actor) {
        authorizationService.requireAnyRole(actor, OfficeRole.ADMIN, OfficeRole.LAWYER, OfficeRole.ASSISTANT);
        Client client = new Client();
        apply(client, request);
        Client saved = clientRepository.save(client);
        auditService.log(AuditActorType.OFFICE_USER, actor.getId(), "CLIENT", saved.getId(), "CREATE", Map.of("name", saved.getName()));
        return toResponse(saved);
    }

    @Transactional
    public ClientResponse update(UUID id, ClientRequest request, OfficeUser actor) {
        authorizationService.requireAnyRole(actor, OfficeRole.ADMIN, OfficeRole.LAWYER, OfficeRole.ASSISTANT);
        Client client = findClient(id);
        apply(client, request);
        Client saved = clientRepository.save(client);
        auditService.log(AuditActorType.OFFICE_USER, actor.getId(), "CLIENT", saved.getId(), "UPDATE", Map.of("name", saved.getName()));
        return toResponse(saved);
    }

    private Client findClient(UUID id) {
        return clientRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Cliente nao encontrado"));
    }

    private void apply(Client client, ClientRequest request) {
        client.setName(request.name().trim());
        client.setCpfEncrypted(trimToNull(request.cpfEncrypted()));
        client.setCpfLast3(trimToNull(request.cpfLast3()));
        client.setEmail(trimToNull(request.email()));
        client.setPhone(trimToNull(request.phone()));
        client.setNotes(trimToNull(request.notes()));
    }

    private ClientResponse toResponse(Client client) {
        return new ClientResponse(
                client.getId(),
                client.getName(),
                client.getCpfLast3(),
                client.getEmail(),
                client.getPhone(),
                client.getNotes(),
                client.getCreatedAt(),
                client.getUpdatedAt());
    }

    private String normalizeFilter(String value) {
        return trimToNull(value);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
