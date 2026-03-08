package com.painel.api.workflow;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "case_stage_substeps")
public class CaseStageSubstep {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "stage_id", nullable = false)
    private CaseStage stage;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(nullable = false)
    private int position;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CaseStageSubstepStatus status;

    @Column(name = "visible_to_client", nullable = false)
    private boolean visibleToClient;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        OffsetDateTime now = OffsetDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public CaseStage getStage() { return stage; }
    public void setStage(CaseStage stage) { this.stage = stage; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }
    public CaseStageSubstepStatus getStatus() { return status; }
    public void setStatus(CaseStageSubstepStatus status) { this.status = status; }
    public boolean isVisibleToClient() { return visibleToClient; }
    public void setVisibleToClient(boolean visibleToClient) { this.visibleToClient = visibleToClient; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
