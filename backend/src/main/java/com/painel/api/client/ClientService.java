package com.painel.api.client;

import com.painel.api.auth.AuthorizationService;
import com.painel.api.audit.AuditActorType;
import com.painel.api.audit.AuditService;
import com.painel.api.casefile.ClientCaseCountView;
import com.painel.api.casefile.CaseFileRepository;
import com.painel.api.common.NotFoundException;
import com.painel.api.common.PagedResponse;
import com.painel.api.user.OfficeRole;
import com.painel.api.user.OfficeUser;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ClientService {
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final ClientRepository clientRepository;
    private final CaseFileRepository caseFileRepository;
    private final AuthorizationService authorizationService;
    private final AuditService auditService;

    public ClientService(
            ClientRepository clientRepository,
            CaseFileRepository caseFileRepository,
            AuthorizationService authorizationService,
            AuditService auditService) {
        this.clientRepository = clientRepository;
        this.caseFileRepository = caseFileRepository;
        this.authorizationService = authorizationService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public PagedResponse<ClientListItemResponse> list(String search, int page, int size, OfficeUser actor) {
        authorizationService.requireAnyRole(actor, OfficeRole.ADMINISTRADOR, OfficeRole.GESTOR, OfficeRole.ESTAGIARIO);
        String normalizedSearch = normalizeFilter(search);
        String searchPrefix = normalizedSearch != null ? normalizedSearch.toLowerCase() + "%" : null;
        String phonePrefix = normalizedSearch != null ? digitsPrefix(normalizedSearch) : null;
        int normalizedPage = Math.max(page, 0);
        int normalizedSize = Math.max(1, Math.min(size, 100));
        PageRequest pageRequest = PageRequest.of(normalizedPage, normalizedSize);
        Page<Client> clients = normalizedSearch == null
                ? clientRepository.findAllByOrderByUpdatedAtDesc(pageRequest)
                : clientRepository.search(searchPrefix, phonePrefix, pageRequest);
        Map<UUID, Long> caseCountsByClientId = loadCaseCounts(clients.getContent());
        return new PagedResponse<>(
                clients.getContent().stream()
                        .map(client -> toListItemResponse(client, caseCountsByClientId.getOrDefault(client.getId(), 0L)))
                        .toList(),
                clients.getNumber(),
                clients.getSize(),
                clients.getTotalElements(),
                clients.getTotalPages());
    }

    @Transactional(readOnly = true)
    public ClientResponse getById(UUID id, OfficeUser actor) {
        authorizationService.requireAnyRole(actor, OfficeRole.ADMINISTRADOR, OfficeRole.GESTOR, OfficeRole.ESTAGIARIO);
        return toResponse(findClient(id));
    }

    @Transactional
    public ClientResponse create(ClientRequest request, OfficeUser actor) {
        authorizationService.requireAnyRole(actor, OfficeRole.ADMINISTRADOR, OfficeRole.GESTOR);
        Client client = new Client();
        apply(client, request);
        Client saved = clientRepository.save(client);
        auditService.log(AuditActorType.OFFICE_USER, actor.getId(), "CLIENT", saved.getId(), "CREATE", Map.of("name", saved.getName()));
        return toResponse(saved);
    }

    @Transactional
    public ClientResponse update(UUID id, ClientRequest request, OfficeUser actor) {
        authorizationService.requireAnyRole(actor, OfficeRole.ADMINISTRADOR, OfficeRole.GESTOR);
        Client client = findClient(id);
        apply(client, request);
        Client saved = clientRepository.save(client);
        auditService.log(AuditActorType.OFFICE_USER, actor.getId(), "CLIENT", saved.getId(), "UPDATE", Map.of("name", saved.getName()));
        return toResponse(saved);
    }

    @Transactional
    public ClientDeleteResponse delete(UUID id, OfficeUser actor) {
        authorizationService.requireAnyRole(actor, OfficeRole.ADMINISTRADOR, OfficeRole.GESTOR);
        Client client = findClient(id);
        var linkedCases = caseFileRepository.findByClient_Id(id);
        int deletedCases = 0;
        if (!linkedCases.isEmpty()) {
            deletedCases = linkedCases.size();
            caseFileRepository.deleteAll(linkedCases);
        }
        clientRepository.delete(client);
        auditService.log(
                AuditActorType.OFFICE_USER,
                actor.getId(),
                "CLIENT",
                id,
                "DELETE",
                Map.of("deletedCasesCount", Integer.toString(deletedCases)));
        return new ClientDeleteResponse(
                true,
                deletedCases,
                "Cliente removido com hard delete. Casos vinculados tambem foram removidos. Arquivos fisicos podem permanecer no storage.");
    }

    private Client findClient(UUID id) {
        return clientRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Cliente nao encontrado"));
    }

    private void apply(Client client, ClientRequest request) {
        String normalizedName = trimToNull(request.name());
        if (normalizedName == null) {
            throw new IllegalArgumentException("Nome e obrigatorio.");
        }
        String cpfLast3 = normalizeCpfLast3(request.cpfLast3());
        String normalizedEmail = normalizeEmail(request.email());
        String normalizedPhone = normalizePhone(request.phone());

        client.setName(normalizedName);
        client.setCpfEncrypted(trimToNull(request.cpfEncrypted()));
        client.setCpfLast3(cpfLast3);
        client.setEmail(normalizedEmail);
        client.setPhone(normalizedPhone);
        client.setNotes(trimToNull(request.notes()));
    }

    private ClientResponse toResponse(Client client) {
        return toResponse(client, caseFileRepository.countByClient_Id(client.getId()));
    }

    private ClientResponse toResponse(Client client, long caseCount) {
        return new ClientResponse(
                client.getId(),
                client.getName(),
                client.getCpfLast3(),
                client.getEmail(),
                client.getPhone(),
                caseCount,
                client.getNotes(),
                client.getCreatedAt(),
                client.getUpdatedAt());
    }

    private ClientListItemResponse toListItemResponse(Client client, long caseCount) {
        return new ClientListItemResponse(
                client.getId(),
                client.getName(),
                client.getCpfLast3(),
                client.getEmail(),
                client.getPhone(),
                caseCount);
    }

    private Map<UUID, Long> loadCaseCounts(List<Client> clients) {
        if (clients.isEmpty()) {
            return Map.of();
        }
        return caseFileRepository.countByClientIds(clients.stream().map(Client::getId).toList()).stream()
                .collect(java.util.stream.Collectors.toMap(ClientCaseCountView::getClientId, ClientCaseCountView::getCaseCount));
    }

    private String normalizeFilter(String value) {
        return trimToNull(value);
    }

    private String digitsPrefix(String value) {
        String digits = value.replaceAll("\\D", "");
        if (digits.isBlank()) {
            return null;
        }
        return digits + "%";
    }

    private String normalizeCpfLast3(String value) {
        String normalized = trimToNull(value);
        if (normalized == null || !normalized.matches("^\\d{3}$")) {
            throw new IllegalArgumentException("Primeiros 3 digitos do CPF/CNPJ devem ter exatamente 3 numeros.");
        }
        return normalized;
    }

    private String normalizeEmail(String value) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            return null;
        }
        if (!EMAIL_PATTERN.matcher(normalized).matches()) {
            throw new IllegalArgumentException("E-mail invalido.");
        }
        return normalized;
    }

    private String normalizePhone(String value) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            return null;
        }
        String digits = normalized.replaceAll("\\D", "");
        if (digits.length() != 10 && digits.length() != 11) {
            throw new IllegalArgumentException("Telefone deve conter 10 ou 11 digitos.");
        }
        return digits;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
