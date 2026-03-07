package com.painel.api.updates;

import com.painel.api.common.Visibility;
import java.time.OffsetDateTime;
import java.util.UUID;

public record CaseUpdateResponse(
        UUID id,
        UUID caseId,
        Visibility visibility,
        String type,
        String content,
        UUID createdBy,
        String createdByName,
        OffsetDateTime createdAt
) {
}
