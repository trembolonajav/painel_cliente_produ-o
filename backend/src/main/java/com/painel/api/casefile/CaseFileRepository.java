package com.painel.api.casefile;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CaseFileRepository extends JpaRepository<CaseFile, UUID> {
    @Query("""
            select c
            from CaseFile c
            join fetch c.client cl
            where (:status is null or c.status = :status)
              and (:clientId is null or cl.id = :clientId)
            order by c.updatedAt desc
            """)
    List<CaseFile> searchAll(@Param("status") CaseStatus status, @Param("clientId") UUID clientId);

    @Query("""
            select c
            from CaseFile c
            join fetch c.client cl
            where (:status is null or c.status = :status)
              and (:clientId is null or cl.id = :clientId)
              and (lower(c.title) like lower(concat('%', :search, '%'))
                  or lower(coalesce(c.caseNumber, '')) like lower(concat('%', :search, '%')))
            order by c.updatedAt desc
            """)
    List<CaseFile> searchAllWithTerm(@Param("status") CaseStatus status, @Param("clientId") UUID clientId, @Param("search") String search);

    @Query("""
            select distinct c
            from CaseFile c
            join fetch c.client cl
            join CaseMember cm on cm.caseFile.id = c.id
            where cm.user.id = :userId
              and (:status is null or c.status = :status)
              and (:clientId is null or cl.id = :clientId)
            order by c.updatedAt desc
            """)
    List<CaseFile> searchByMember(
            @Param("userId") UUID userId,
            @Param("status") CaseStatus status,
            @Param("clientId") UUID clientId);

    @Query("""
            select distinct c
            from CaseFile c
            join fetch c.client cl
            join CaseMember cm on cm.caseFile.id = c.id
            where cm.user.id = :userId
              and (:status is null or c.status = :status)
              and (:clientId is null or cl.id = :clientId)
              and (lower(c.title) like lower(concat('%', :search, '%'))
                  or lower(coalesce(c.caseNumber, '')) like lower(concat('%', :search, '%')))
            order by c.updatedAt desc
            """)
    List<CaseFile> searchByMemberWithTerm(
            @Param("userId") UUID userId,
            @Param("status") CaseStatus status,
            @Param("clientId") UUID clientId,
            @Param("search") String search);
}
