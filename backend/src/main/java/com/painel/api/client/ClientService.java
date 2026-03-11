package com.painel.api.client;

import com.painel.api.auth.AuthorizationService;
import com.painel.api.audit.AuditActorType;
import com.painel.api.audit.AuditService;
import com.painel.api.casefile.CaseFileRepository;
import com.painel.api.common.NotFoundException;
import com.painel.api.user.OfficeRole;
import com.painel.api.user.OfficeUser;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
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
    public List<ClientResponse> list(String search, OfficeUser actor) {
        authorizationService.requireAnyRole(actor, OfficeRole.ADMINISTRADOR, OfficeRole.GESTOR, OfficeRole.ESTAGIARIO);
        String normalizedSearch = normalizeFilter(search);
        List<Client> clients = normalizedSearch == null
                ? clientRepository.findAllByOrderByUpdatedAtDesc()
                : clientRepository.search(normalizedSearch);
        return clients.stream().map(this::toResponse).toList();
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

    private String normalizeCpfLast3(String value) {
        String normalized = trimToNull(value);
        if (normalized == null || !normalized.matches("^\\d{3}$")) {
            throw new IllegalArgumentException("Ultimos 3 digitos do CPF/CNPJ devem ter exatamente 3 numeros.");
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
