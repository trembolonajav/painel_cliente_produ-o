package com.painel.api.portal;

import com.painel.api.casefile.CasePriority;
import com.painel.api.casefile.CaseStatus;
import java.util.UUID;

public record ClientPortalMeResponse(
        String clientName,
        UUID caseId,
        String caseTitle,
        CaseStatus caseStatus,
        CasePriority casePriority
) {
}
