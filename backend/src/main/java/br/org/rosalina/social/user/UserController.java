package br.org.rosalina.social.user;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.LockModeType;
import br.org.rosalina.social.audit.AuditService;
import br.org.rosalina.social.common.*;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.security.Principal;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@Transactional
public class UserController {
  @PersistenceContext private EntityManager entityManager;
  private final AppUserRepository repo;
  private final PasswordEncoder encoder;
  private final AuditService audit;

  public UserController(AppUserRepository repo, PasswordEncoder encoder, AuditService audit) {
    this.repo = repo; this.encoder = encoder; this.audit = audit;
  }

  @Schema(name="UserRequest")
  public record Request(@NotBlank @Size(max=150) String name,
      @NotBlank @Email @Size(max=255) String email, @NotNull Role role,
      @NotBlank @Size(min=8,max=100) String password) {}
  @Schema(name="UserUpdateRequest")
  public record UpdateRequest(@NotBlank @Size(max=150) String name, @NotNull Role role) {}
  @Schema(name="UserStatusRequest")
  public record StatusRequest(@NotNull Boolean active) {}
  @Schema(name="UserPasswordResetRequest")
  public record PasswordRequest(@NotBlank @Size(min=8,max=100) String newPassword) {}
  @Schema(name="UserResponse")
  public record Response(UUID id, String name, String email, Role role, boolean active) {
    static Response of(AppUser u) { return new Response(u.getId(), u.getName(), u.getEmail(), u.getRole(), u.isActive()); }
  }

  @GetMapping
  @Transactional(readOnly=true)
  List<Response> list() {
    return repo.findAll(org.springframework.data.domain.Sort.by("name", "email")).stream().map(Response::of).toList();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  Response create(@Valid @RequestBody Request r) {
    PasswordValidation.validateNew(r.password(), "password");
    String email = r.email().strip().toLowerCase(Locale.ROOT);
    if (repo.existsByEmailIgnoreCase(email)) throw new ApiException(HttpStatus.CONFLICT,
        "E-mail já cadastrado.", Map.of("email", "Este e-mail já possui uma conta, inclusive se estiver inativa."));
    AppUser u = new AppUser();
    u.setName(r.name().strip()); u.setEmail(email); u.setRole(r.role());
    u.setPasswordHash(encoder.encode(r.password()));
    repo.saveAndFlush(u);
    audit.record("CREATE", "USER", u.getId());
    return Response.of(u);
  }

  @PutMapping("/{id}")
  Response update(@PathVariable UUID id, @Valid @RequestBody UpdateRequest r, Principal principal) {
    AppUser u = findForUpdate(id);
    if (u.getEmail().equalsIgnoreCase(principal.getName()) && r.role() != Role.ADMIN)
      throw ApiException.field("role", "Você não pode remover seu próprio acesso de administrador.");
    u.setName(r.name().strip()); u.setRole(r.role());
    audit.record("UPDATE", "USER", id);
    return Response.of(u);
  }

  @PatchMapping("/{id}")
  Response status(@PathVariable UUID id, @Valid @RequestBody StatusRequest r, Principal principal) {
    AppUser u = findForUpdate(id);
    if (!r.active() && u.getEmail().equalsIgnoreCase(principal.getName()))
      throw ApiException.field("active", "Você não pode desativar sua própria conta.");
    if (u.isActive() != r.active()) u.invalidateSessions();
    u.setActive(r.active());
    audit.record(r.active() ? "ACTIVATE" : "DEACTIVATE", "USER", id);
    return Response.of(u);
  }

  @PutMapping("/{id}/password")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  void resetPassword(@PathVariable UUID id, @Valid @RequestBody PasswordRequest r, Principal principal) {
    AppUser u = findForUpdate(id);
    if (u.getEmail().equalsIgnoreCase(principal.getName()))
      throw ApiException.field("newPassword", "Para alterar sua própria senha, use Meu perfil.");
    PasswordValidation.validateNew(r.newPassword(), "newPassword");
    if (encoder.matches(r.newPassword(), u.getPasswordHash()))
      throw ApiException.field("newPassword", "Escolha uma senha diferente da atual.");
    u.setPasswordHash(encoder.encode(r.newPassword()));
    u.invalidateSessions();
    audit.record("RESET_PASSWORD", "USER", id);
  }

  private AppUser findForUpdate(UUID id) {
    AppUser user=repo.findByIdForUpdate(id).orElseThrow(() -> new NotFoundException("Usuário não encontrado."));
    entityManager.refresh(user,LockModeType.PESSIMISTIC_WRITE);
    return user;
  }
}
