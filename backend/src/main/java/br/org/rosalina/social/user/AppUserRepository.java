package br.org.rosalina.social.user;
import java.util.*; import org.springframework.data.jpa.repository.JpaRepository;
public interface AppUserRepository extends JpaRepository<AppUser, UUID> { Optional<AppUser> findByEmailIgnoreCase(String email); boolean existsByEmailIgnoreCase(String email); }
