package com.painel.api.user;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OfficeUserRepository extends JpaRepository<OfficeUser, UUID> {
    Optional<OfficeUser> findByEmail(String email);
    boolean existsByEmail(String email);
    Page<OfficeUser> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("""
            select u
            from OfficeUser u
            where lower(u.name) like lower(concat('%', :search, '%'))
               or lower(u.email) like lower(concat('%', :search, '%'))
               or (:digits <> '' and coalesce(u.phone, '') like concat('%', :digits, '%'))
            order by u.createdAt desc
            """)
    Page<OfficeUser> search(@Param("search") String search, @Param("digits") String digits, Pageable pageable);
}
