package br.org.rosalina.social.user;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.LockModeType;
import br.org.rosalina.social.audit.AuditService;
import br.org.rosalina.social.common.ApiException;
import br.org.rosalina.social.common.PasswordValidation;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileService {
  @PersistenceContext private EntityManager entityManager;
  private final AppUserRepository users;
  private final PasswordEncoder encoder;
  private final AuditService audit;

  public ProfileService(AppUserRepository users, PasswordEncoder encoder, AuditService audit) {
    this.users = users;
    this.encoder = encoder;
    this.audit = audit;
  }

  @Transactional(readOnly = true)
  public ProfileController.Response get(String email) {
    return ProfileController.Response.of(users.findByEmailIgnoreCase(email)
        .filter(AppUser::isActive).orElseThrow(ProfileService::invalidSession));
  }

  @Transactional
  public ProfileController.Response updateName(String email, String name) {
    AppUser user = currentForUpdate(email);
    user.setName(name);
    audit.record("UPDATE_PROFILE", "USER", user.getId());
    return ProfileController.Response.of(user);
  }

  @Transactional
  public void changePassword(String email, String currentPassword, String newPassword) {
    AppUser user = currentForUpdate(email);
    if (!PasswordValidation.fitsBcrypt(currentPassword) || !encoder.matches(currentPassword, user.getPasswordHash())) {
      throw ApiException.field("currentPassword", "Senha atual incorreta.");
    }
    if (newPassword.equals(currentPassword)) {
      throw ApiException.field("newPassword", "Escolha uma senha diferente da atual.");
    }
    PasswordValidation.validateNew(newPassword, "newPassword");
    user.setPasswordHash(encoder.encode(newPassword));
    user.invalidateSessions();
    audit.record("CHANGE_PASSWORD", "USER", user.getId());
  }

  private AppUser currentForUpdate(String email) {
    AppUser user=users.findByEmailForUpdate(email).orElseThrow(ProfileService::invalidSession);
    entityManager.refresh(user,LockModeType.PESSIMISTIC_WRITE);
    if (!user.isActive()) throw invalidSession();
    return user;
  }

  private static ApiException invalidSession() {
    return new ApiException(HttpStatus.UNAUTHORIZED, "Sessão inválida.");
  }
}
