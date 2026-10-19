package br.org.rosalina.social.user;

import br.org.rosalina.social.audit.AuditService;
import br.org.rosalina.social.common.ApiException;
import java.nio.charset.StandardCharsets;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileService {
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
    if (!encoder.matches(currentPassword, user.getPasswordHash())) {
      throw ApiException.field("currentPassword", "Senha atual incorreta.");
    }
    if (newPassword.equals(currentPassword)) {
      throw ApiException.field("newPassword", "Escolha uma senha diferente da atual.");
    }
    // BCrypt considera apenas os primeiros 72 bytes; evite truncar a senha silenciosamente.
    if (newPassword.getBytes(StandardCharsets.UTF_8).length > 72) {
      throw ApiException.field("newPassword", "A senha deve ocupar no máximo 72 bytes em UTF-8.");
    }
    user.setPasswordHash(encoder.encode(newPassword));
    audit.record("CHANGE_PASSWORD", "USER", user.getId());
  }

  private AppUser currentForUpdate(String email) {
    return users.findByEmailForUpdate(email).filter(AppUser::isActive)
        .orElseThrow(ProfileService::invalidSession);
  }

  private static ApiException invalidSession() {
    return new ApiException(HttpStatus.UNAUTHORIZED, "Sessão inválida.");
  }
}
