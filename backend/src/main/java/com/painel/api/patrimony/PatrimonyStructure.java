package com.painel.api.patrimony;

import com.painel.api.casefile.CaseFile;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "patrimony_structures")
public class PatrimonyStructure {

    @Id
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "case_id", nullable = false, unique = true)
    private CaseFile caseFile;

    @Column(nullable = false, length = 180)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PatrimonyStatus status;

    @Column(nullable = false)
    private int version;

    @Column(name = "notes_internal", columnDefinition = "TEXT")
    private String notesInternal;

    @Column(name = "notes_client", columnDefinition = "TEXT")
    private String notesClient;

    @Column(name = "original_document_name", length = 255)
    private String originalDocumentName;

    @Column(name = "original_document_mime_type", length = 120)
    private String originalDocumentMimeType;

    @Column(name = "original_document_size_bytes")
    private Long originalDocumentSizeBytes;

    @Column(name = "original_document_storage_key", length = 512)
    private String originalDocumentStorageKey;

    @Column(name = "original_document_visible_to_client", nullable = false)
    private boolean originalDocumentVisibleToClient;

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
    public CaseFile getCaseFile() { return caseFile; }
    public void setCaseFile(CaseFile caseFile) { this.caseFile = caseFile; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public PatrimonyStatus getStatus() { return status; }
    public void setStatus(PatrimonyStatus status) { this.status = status; }
    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }
    public String getNotesInternal() { return notesInternal; }
    public void setNotesInternal(String notesInternal) { this.notesInternal = notesInternal; }
    public String getNotesClient() { return notesClient; }
    public void setNotesClient(String notesClient) { this.notesClient = notesClient; }
    public String getOriginalDocumentName() { return originalDocumentName; }
    public void setOriginalDocumentName(String originalDocumentName) { this.originalDocumentName = originalDocumentName; }
    public String getOriginalDocumentMimeType() { return originalDocumentMimeType; }
    public void setOriginalDocumentMimeType(String originalDocumentMimeType) { this.originalDocumentMimeType = originalDocumentMimeType; }
    public Long getOriginalDocumentSizeBytes() { return originalDocumentSizeBytes; }
    public void setOriginalDocumentSizeBytes(Long originalDocumentSizeBytes) { this.originalDocumentSizeBytes = originalDocumentSizeBytes; }
    public String getOriginalDocumentStorageKey() { return originalDocumentStorageKey; }
    public void setOriginalDocumentStorageKey(String originalDocumentStorageKey) { this.originalDocumentStorageKey = originalDocumentStorageKey; }
    public boolean isOriginalDocumentVisibleToClient() { return originalDocumentVisibleToClient; }
    public void setOriginalDocumentVisibleToClient(boolean originalDocumentVisibleToClient) { this.originalDocumentVisibleToClient = originalDocumentVisibleToClient; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
