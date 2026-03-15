package com.painel.api.partner;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PartnerRepository extends JpaRepository<Partner, UUID> {
    boolean existsByEmailIgnoreCaseAndIdNot(String email, UUID id);
    boolean existsByEmailIgnoreCase(String email);
    Page<Partner> findAllByOrderByNameAsc(Pageable pageable);
}
