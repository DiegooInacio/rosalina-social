package br.org.rosalina.social.user;
import java.util.*; import org.springframework.data.jpa.repository.JpaRepository;
public interface AppUserRepository extends JpaRepository<AppUser, UUID> {
 @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
 @org.springframework.data.jpa.repository.Query("select u from AppUser u where u.id = :id")
 Optional<AppUser> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") UUID id);
 Optional<AppUser> findByEmailIgnoreCase(String email);
 boolean existsByEmailIgnoreCase(String email);
 @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
 @org.springframework.data.jpa.repository.Query("select u from AppUser u where lower(u.email) = lower(:email)")
 Optional<AppUser> findByEmailForUpdate(@org.springframework.data.repository.query.Param("email") String email);
}
