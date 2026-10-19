package br.org.rosalina.social.user;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.security.Principal;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/me")
public class ProfileController {
  private final ProfileService service;

  public ProfileController(ProfileService service) { this.service = service; }

  @Schema(name = "ProfileResponse")
  public record Response(UUID id, String name, String email, Role role) {
    static Response of(AppUser user) {
      return new Response(user.getId(), user.getName(), user.getEmail(), user.getRole());
    }
  }

  @Schema(name = "ProfileNameRequest")
  public record NameRequest(@NotBlank @Size(max = 150) String name) {
    public NameRequest { if (name != null) name = name.strip(); }
  }

  @Schema(name = "ProfilePasswordRequest")
  public record PasswordRequest(
      @NotBlank String currentPassword,
      @NotBlank @Size(min = 8, max = 100) String newPassword) {}

  @GetMapping
  Response get(Principal principal) { return service.get(principal.getName()); }

  @PatchMapping
  Response update(Principal principal, @Valid @RequestBody NameRequest request) {
    return service.updateName(principal.getName(), request.name());
  }

  @PutMapping("/password")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  void password(Principal principal, @Valid @RequestBody PasswordRequest request) {
    service.changePassword(principal.getName(), request.currentPassword(), request.newPassword());
  }
}
