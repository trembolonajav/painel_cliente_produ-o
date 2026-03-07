package com.painel.api.user;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OfficeUserRepository extends JpaRepository<OfficeUser, UUID> {
    Optional<OfficeUser> findByEmail(String email);
    boolean existsByEmail(String email);
}
