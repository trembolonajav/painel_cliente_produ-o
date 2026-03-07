package com.painel.api.auth;

import com.painel.api.config.SeedProperties;
import com.painel.api.user.OfficeRole;
import com.painel.api.user.OfficeUser;
import com.painel.api.user.OfficeUserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Profile("dev")
public class DevDataSeeder implements CommandLineRunner {

    private final OfficeUserRepository officeUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final SeedProperties seedProperties;

    public DevDataSeeder(OfficeUserRepository officeUserRepository, PasswordEncoder passwordEncoder, SeedProperties seedProperties) {
        this.officeUserRepository = officeUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.seedProperties = seedProperties;
    }

    @Override
    public void run(String... args) {
        if (officeUserRepository.existsByEmail(seedProperties.adminEmail().toLowerCase())) {
            return;
        }

        OfficeUser admin = new OfficeUser();
        admin.setName(seedProperties.adminName());
        admin.setEmail(seedProperties.adminEmail());
        admin.setPasswordHash(passwordEncoder.encode(seedProperties.adminPassword()));
        admin.setRole(OfficeRole.ADMINISTRADOR);
        admin.setActive(true);
        officeUserRepository.save(admin);
    }
}
