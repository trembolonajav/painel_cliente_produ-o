package com.painel.api.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class RequestTimingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RequestTimingFilter.class);

    private final ObservabilityProperties observabilityProperties;

    public RequestTimingFilter(ObservabilityProperties observabilityProperties) {
        this.observabilityProperties = observabilityProperties;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!observabilityProperties.getRequests().isEnabled()) {
            return true;
        }
        String path = normalizePath(request.getRequestURI());
        return !observabilityProperties.getRequests().isIncludeHealth() && "/health".equals(path);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        long startedAt = System.nanoTime();
        String method = request.getMethod();
        String path = normalizePath(request.getRequestURI());
        String flow = classifyFlow(method, path);
        try {
            filterChain.doFilter(request, response);
        } finally {
            long durationMs = (System.nanoTime() - startedAt) / 1_000_000;
            int status = response.getStatus();
            boolean slow = durationMs >= observabilityProperties.getRequests().getWarnThresholdMs();
            if (status >= 500) {
                log.error("http flow={} method={} path={} status={} durationMs={}",
                        flow, method, path, status, durationMs);
            } else if (slow) {
                log.warn("http flow={} method={} path={} status={} durationMs={}",
                        flow, method, path, status, durationMs);
            } else {
                log.info("http flow={} method={} path={} status={} durationMs={}",
                        flow, method, path, status, durationMs);
            }
        }
    }

    private String normalizePath(String requestUri) {
        if (requestUri == null || requestUri.isBlank()) {
            return "/";
        }
        return requestUri;
    }

    private String classifyFlow(String method, String path) {
        if ("/auth/login".equals(path)) {
            return "auth.login";
        }
        if ("/auth/me".equals(path)) {
            return "auth.me";
        }
        if ("/cases/dashboard".equals(path)) {
            return "dashboard.read";
        }
        if ("/cases".equals(path) && "POST".equals(method)) {
            return "case.write";
        }
        if ("/client-portal/bootstrap".equals(path)) {
            return "portal.bootstrap";
        }
        if ("/client-portal/session".equals(path)) {
            return "portal.session";
        }
        if ("/clients".equals(path) && "GET".equals(method)) {
            return "clients.list";
        }
        if (path.matches("^/clients/[^/]+$") && "GET".equals(method)) {
            return "clients.detail";
        }
        if ("/partners".equals(path) && "GET".equals(method)) {
            return "partners.list";
        }
        if (path.matches("^/partners/[^/]+$") && "GET".equals(method)) {
            return "partners.detail";
        }
        if ("/users".equals(path) && "GET".equals(method)) {
            return "users.list";
        }
        if (path.matches("^/users/[^/]+$") && "GET".equals(method)) {
            return "users.detail";
        }
        if (path.matches("^/cases/[^/]+$") && "GET".equals(method)) {
            return "case.detail";
        }
        if (path.matches("^/cases/[^/]+$") && ("PATCH".equals(method) || "DELETE".equals(method))) {
            return "case.write";
        }
        if (path.matches("^/cases/[^/]+/documents.*")) {
            return "GET".equals(method) ? "documents.read" : "documents.write";
        }
        if (path.matches("^/cases/[^/]+/updates.*")) {
            return "GET".equals(method) ? "updates.read" : "updates.write";
        }
        if (path.matches("^/cases/[^/]+/stages.*")
                || path.matches("^/stages/[^/]+.*")
                || path.matches("^/substeps/[^/]+.*")
                || path.matches("^/tasks/[^/]+.*")) {
            return "GET".equals(method) ? "workflow.read" : "workflow.write";
        }
        if (path.matches("^/cases/[^/]+/portal-link.*")) {
            return "portal-link." + ("GET".equals(method) ? "read" : "write");
        }
        if ("/health".equals(path)) {
            return "infra.health";
        }
        return "http.other";
    }
}
