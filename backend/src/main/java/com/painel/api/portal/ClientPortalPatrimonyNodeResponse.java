package com.painel.api.portal;

import java.util.UUID;

public record ClientPortalPatrimonyNodeResponse(
        UUID id,
        UUID parentId,
        String type,
        String label,
        String subtitle,
        String description,
        String value,
        String percentage,
        String location,
        int sortOrder
) {
}
