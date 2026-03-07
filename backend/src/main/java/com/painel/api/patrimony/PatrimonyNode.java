package com.painel.api.patrimony;

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
@Table(name = "patrimony_nodes")
public class PatrimonyNode {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "structure_id", nullable = false)
    private PatrimonyStructure structure;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private PatrimonyNodeType type;

    @Column(nullable = false, length = 180)
    private String label;

    @Column(length = 220)
    private String subtitle;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 120)
    private String value;

    @Column(length = 40)
    private String percentage;

    @Column(length = 220)
    private String location;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private PatrimonyNode parent;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "is_visible_to_client", nullable = false)
    private boolean isVisibleToClient;

    @Column(name = "metadata_json", columnDefinition = "TEXT")
    private String metadataJson;

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
    public PatrimonyStructure getStructure() { return structure; }
    public void setStructure(PatrimonyStructure structure) { this.structure = structure; }
    public PatrimonyNodeType getType() { return type; }
    public void setType(PatrimonyNodeType type) { this.type = type; }
    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }
    public String getSubtitle() { return subtitle; }
    public void setSubtitle(String subtitle) { this.subtitle = subtitle; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }
    public String getPercentage() { return percentage; }
    public void setPercentage(String percentage) { this.percentage = percentage; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public PatrimonyNode getParent() { return parent; }
    public void setParent(PatrimonyNode parent) { this.parent = parent; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
    public boolean isVisibleToClient() { return isVisibleToClient; }
    public void setVisibleToClient(boolean visibleToClient) { isVisibleToClient = visibleToClient; }
    public String getMetadataJson() { return metadataJson; }
    public void setMetadataJson(String metadataJson) { this.metadataJson = metadataJson; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
