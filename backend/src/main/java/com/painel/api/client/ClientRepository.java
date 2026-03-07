package com.painel.api.client;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ClientRepository extends JpaRepository<Client, UUID> {
    @Query("""
            select c
            from Client c
            where lower(c.name) like lower(concat('%', :search, '%'))
                or lower(coalesce(c.email, '')) like lower(concat('%', :search, '%'))
                or lower(coalesce(c.phone, '')) like lower(concat('%', :search, '%'))
            order by c.updatedAt desc
            """)
    List<Client> search(@Param("search") String search);

    List<Client> findAllByOrderByUpdatedAtDesc();
}
