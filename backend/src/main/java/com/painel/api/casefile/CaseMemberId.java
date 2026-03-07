package com.painel.api.casefile;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

@Embeddable
public class CaseMemberId implements Serializable {

    @Column(name = "case_id")
    private UUID caseId;

    @Column(name = "user_id")
    private UUID userId;

    public CaseMemberId() {
    }

    public CaseMemberId(UUID caseId, UUID userId) {
        this.caseId = caseId;
        this.userId = userId;
    }

    public UUID getCaseId() {
        return caseId;
    }

    public void setCaseId(UUID caseId) {
        this.caseId = caseId;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof CaseMemberId that)) {
            return false;
        }
        return Objects.equals(caseId, that.caseId) && Objects.equals(userId, that.userId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(caseId, userId);
    }
}
