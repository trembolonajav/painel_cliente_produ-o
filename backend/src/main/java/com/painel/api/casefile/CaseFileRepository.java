package com.painel.api.casefile;

import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CaseFileRepository extends JpaRepository<CaseFile, UUID> {
    long countByClient_Id(UUID clientId);
    long countByCreatedBy_Id(UUID userId);
    List<CaseFile> findByClient_Id(UUID clientId);

    @Query("""
            select c.client.id as clientId, count(c.id) as caseCount
            from CaseFile c
            where c.client.id in :clientIds
            group by c.client.id
            """)
    List<ClientCaseCountView> countByClientIds(@Param("clientIds") List<UUID> clientIds);

    @EntityGraph(attributePaths = {"client", "partner"})
    @Query("""
            select c
            from CaseFile c
            left join c.partner p
            where (:status is null or c.status = :status)
              and (:clientId is null or c.client.id = :clientId)
            order by c.updatedAt desc
            """)
    Page<CaseFile> searchAll(@Param("status") CaseStatus status, @Param("clientId") UUID clientId, Pageable pageable);

    @EntityGraph(attributePaths = {"client", "partner"})
    @Query("""
            select c
            from CaseFile c
            left join c.partner p
            where (:status is null or c.status = :status)
              and (:clientId is null or c.client.id = :clientId)
            order by c.updatedAt desc
            """)
    List<CaseFile> searchAllForDashboard(@Param("status") CaseStatus status, @Param("clientId") UUID clientId);

    @EntityGraph(attributePaths = {"client", "partner"})
    @Query("""
            select c
            from CaseFile c
            left join c.partner p
            where (:status is null or c.status = :status)
              and (:clientId is null or c.client.id = :clientId)
              and (lower(c.title) like :searchPrefix
                  or lower(coalesce(c.caseNumber, '')) like :searchPrefix
                  or lower(coalesce(p.name, '')) like :searchPrefix)
            order by c.updatedAt desc
            """)
    Page<CaseFile> searchAllWithTerm(@Param("status") CaseStatus status, @Param("clientId") UUID clientId, @Param("searchPrefix") String searchPrefix, Pageable pageable);

    @EntityGraph(attributePaths = {"client", "partner"})
    @Query("""
            select c
            from CaseFile c
            left join c.partner p
            where (:status is null or c.status = :status)
              and (:clientId is null or c.client.id = :clientId)
              and (lower(c.title) like :searchPrefix
                  or lower(coalesce(c.caseNumber, '')) like :searchPrefix
                  or lower(coalesce(p.name, '')) like :searchPrefix)
            order by c.updatedAt desc
            """)
    List<CaseFile> searchAllWithTermForDashboard(
            @Param("status") CaseStatus status,
            @Param("clientId") UUID clientId,
            @Param("searchPrefix") String searchPrefix);

    @EntityGraph(attributePaths = {"client", "partner"})
    @Query(
            value = """
                    select distinct c
                    from CaseFile c
                    join CaseMember cm on cm.caseFile.id = c.id
                    left join c.partner p
                    where cm.user.id = :userId
                      and (:status is null or c.status = :status)
                      and (:clientId is null or c.client.id = :clientId)
                    order by c.updatedAt desc
                    """,
            countQuery = """
                    select count(distinct c.id)
                    from CaseFile c
                    join CaseMember cm on cm.caseFile.id = c.id
                    where cm.user.id = :userId
                      and (:status is null or c.status = :status)
                      and (:clientId is null or c.client.id = :clientId)
                    """)
    Page<CaseFile> searchByMember(
            @Param("userId") UUID userId,
            @Param("status") CaseStatus status,
            @Param("clientId") UUID clientId,
            Pageable pageable);

    @EntityGraph(attributePaths = {"client", "partner"})
    @Query("""
            select distinct c
            from CaseFile c
            join CaseMember cm on cm.caseFile.id = c.id
            left join c.partner p
            where cm.user.id = :userId
              and (:status is null or c.status = :status)
              and (:clientId is null or c.client.id = :clientId)
            order by c.updatedAt desc
            """)
    List<CaseFile> searchByMemberForDashboard(
            @Param("userId") UUID userId,
            @Param("status") CaseStatus status,
            @Param("clientId") UUID clientId);

    @EntityGraph(attributePaths = {"client", "partner"})
    @Query(
            value = """
                    select distinct c
                    from CaseFile c
                    join CaseMember cm on cm.caseFile.id = c.id
                    left join c.partner p
                    where cm.user.id = :userId
                      and (:status is null or c.status = :status)
                      and (:clientId is null or c.client.id = :clientId)
                      and (lower(c.title) like :searchPrefix
                          or lower(coalesce(c.caseNumber, '')) like :searchPrefix
                          or lower(coalesce(p.name, '')) like :searchPrefix)
                    order by c.updatedAt desc
                    """,
            countQuery = """
                    select count(distinct c.id)
                    from CaseFile c
                    left join c.partner p
                    join CaseMember cm on cm.caseFile.id = c.id
                    where cm.user.id = :userId
                      and (:status is null or c.status = :status)
                      and (:clientId is null or c.client.id = :clientId)
                      and (lower(c.title) like :searchPrefix
                          or lower(coalesce(c.caseNumber, '')) like :searchPrefix
                          or lower(coalesce(p.name, '')) like :searchPrefix)
                    """)
    Page<CaseFile> searchByMemberWithTerm(
            @Param("userId") UUID userId,
            @Param("status") CaseStatus status,
            @Param("clientId") UUID clientId,
            @Param("searchPrefix") String searchPrefix,
            Pageable pageable);

    @EntityGraph(attributePaths = {"client", "partner"})
    @Query("""
            select distinct c
            from CaseFile c
            join CaseMember cm on cm.caseFile.id = c.id
            left join c.partner p
            where cm.user.id = :userId
              and (:status is null or c.status = :status)
              and (:clientId is null or c.client.id = :clientId)
              and (lower(c.title) like :searchPrefix
                  or lower(coalesce(c.caseNumber, '')) like :searchPrefix
                  or lower(coalesce(p.name, '')) like :searchPrefix)
            order by c.updatedAt desc
            """)
    List<CaseFile> searchByMemberWithTermForDashboard(
            @Param("userId") UUID userId,
            @Param("status") CaseStatus status,
            @Param("clientId") UUID clientId,
            @Param("searchPrefix") String searchPrefix);
}
