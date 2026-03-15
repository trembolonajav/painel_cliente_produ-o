package com.painel.api.client;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ClientRepository extends JpaRepository<Client, UUID> {
    @Query("""
            select c
            from Client c
            where lower(c.name) like :searchPrefix
                or lower(coalesce(c.email, '')) like :searchPrefix
                or (:phonePrefix is not null and coalesce(c.phone, '') like :phonePrefix)
            order by c.updatedAt desc
            """)
    Page<Client> search(@Param("searchPrefix") String searchPrefix, @Param("phonePrefix") String phonePrefix, Pageable pageable);

    Page<Client> findAllByOrderByUpdatedAtDesc(Pageable pageable);
}
