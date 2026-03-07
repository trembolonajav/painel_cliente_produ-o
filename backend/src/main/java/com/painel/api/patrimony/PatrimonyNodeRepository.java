package com.painel.api.patrimony;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PatrimonyNodeRepository extends JpaRepository<PatrimonyNode, UUID> {
    List<PatrimonyNode> findByStructure_IdOrderBySortOrderAsc(UUID structureId);
}
