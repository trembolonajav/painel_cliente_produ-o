package com.painel.api.casefile;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CaseMemberRepository extends JpaRepository<CaseMember, CaseMemberId> {
    List<CaseMember> findByCaseFile_Id(UUID caseId);
    Optional<CaseMember> findByCaseFile_IdAndUser_Id(UUID caseId, UUID userId);
    boolean existsByCaseFile_IdAndUser_Id(UUID caseId, UUID userId);
    void deleteByCaseFile_IdAndUser_Id(UUID caseId, UUID userId);
}
