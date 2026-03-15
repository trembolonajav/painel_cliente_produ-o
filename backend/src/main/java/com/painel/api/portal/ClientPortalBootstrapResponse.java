package com.painel.api.portal;

import com.painel.api.document.DocumentResponse;
import com.painel.api.updates.CaseUpdateResponse;
import java.util.List;

public record ClientPortalBootstrapResponse(
        ClientPortalMeResponse me,
        ClientPortalCaseResponse caseData,
        List<DocumentResponse> documents,
        List<CaseUpdateResponse> updates,
        List<ClientPortalStageResponse> stages,
        ClientPortalPatrimonyResponse patrimony,
        ClientPortalPatrimonyOriginalDocumentResponse patrimonyOriginalDocument
) {
}
