package com.painel.api.portal;

import java.util.List;
import java.util.UUID;

public record ClientPortalPatrimonyResponse(
        UUID structureId,
        String title,
        String status,
        List<ClientPortalPatrimonyNodeResponse> nodes
) {
}
