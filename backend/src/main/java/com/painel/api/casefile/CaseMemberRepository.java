package com.painel.api.casefile;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CaseMemberRepository extends JpaRepository<CaseMember, CaseMemberId> {
    List<CaseMember> findByCaseFile_Id(UUID caseId);

    @Query("""
            select cm
            from CaseMember cm
            join fetch cm.user u
            where cm.caseFile.id in :caseIds
            """)
    List<CaseMember> findByCaseFile_IdIn(@Param("caseIds") List<UUID> caseIds);

    Optional<CaseMember> findByCaseFile_IdAndUser_Id(UUID caseId, UUID userId);
    Optional<CaseMember> findByCaseFile_IdAndPermission(UUID caseId, CaseMemberPermission permission);
    boolean existsByCaseFile_IdAndUser_Id(UUID caseId, UUID userId);
    void deleteByCaseFile_IdAndUser_Id(UUID caseId, UUID userId);
}
