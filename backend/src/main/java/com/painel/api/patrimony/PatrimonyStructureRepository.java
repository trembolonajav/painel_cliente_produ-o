package com.painel.api.patrimony;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PatrimonyStructureRepository extends JpaRepository<PatrimonyStructure, UUID> {
    Optional<PatrimonyStructure> findByCaseFile_Id(UUID caseId);
}
