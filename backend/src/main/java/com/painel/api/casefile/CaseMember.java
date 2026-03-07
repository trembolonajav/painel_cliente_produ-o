package com.painel.api.casefile;

import com.painel.api.user.OfficeUser;
import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "case_members")
public class CaseMember {

    @EmbeddedId
    private CaseMemberId id = new CaseMemberId();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("caseId")
    @JoinColumn(name = "case_id", nullable = false)
    private CaseFile caseFile;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("userId")
    @JoinColumn(name = "user_id", nullable = false)
    private OfficeUser user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CaseMemberPermission permission;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (id == null) {
            id = new CaseMemberId(caseFile.getId(), user.getId());
        }
        createdAt = OffsetDateTime.now();
    }

    public CaseMemberId getId() {
        return id;
    }

    public CaseFile getCaseFile() {
        return caseFile;
    }

    public void setCaseFile(CaseFile caseFile) {
        this.caseFile = caseFile;
    }

    public OfficeUser getUser() {
        return user;
    }

    public void setUser(OfficeUser user) {
        this.user = user;
    }

    public CaseMemberPermission getPermission() {
        return permission;
    }

    public void setPermission(CaseMemberPermission permission) {
        this.permission = permission;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
