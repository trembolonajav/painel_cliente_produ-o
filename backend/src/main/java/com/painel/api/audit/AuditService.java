package com.painel.api.audit;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public AuditService(AuditLogRepository auditLogRepository, ObjectMapper objectMapper) {
        this.auditLogRepository = auditLogRepository;
        this.objectMapper = objectMapper;
    }

    public void log(AuditActorType actorType, UUID actorId, String entity, UUID entityId, String action) {
        log(actorType, actorId, entity, entityId, action, null);
    }

    public void log(AuditActorType actorType, UUID actorId, String entity, UUID entityId, String action, Map<String, Object> details) {
        AuditLog log = new AuditLog();
        log.setActorType(actorType.name());
        log.setActorId(actorId);
        log.setEntity(entity);
        log.setEntityId(entityId);
        log.setAction(action);
        log.setDetailsJson(toJson(details));

        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs != null) {
            log.setIp(attrs.getRequest().getRemoteAddr());
            log.setUserAgent(attrs.getRequest().getHeader("User-Agent"));
        }

        auditLogRepository.save(log);
    }

    private String toJson(Map<String, Object> details) {
        if (details == null || details.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(details);
        } catch (JsonProcessingException e) {
            return null;
        }
    }
}
