package com.painel.api.partner;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PartnerRepository extends JpaRepository<Partner, UUID> {
    boolean existsByEmailIgnoreCaseAndIdNot(String email, UUID id);
    boolean existsByEmailIgnoreCase(String email);
    List<Partner> findAllByOrderByUpdatedAtDesc();
}
