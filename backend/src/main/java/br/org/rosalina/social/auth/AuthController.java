package br.org.rosalina.social.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
  private final AuthService service;
  private final LoginLimiter limiter;
  public AuthController(AuthService service, LoginLimiter limiter) { this.service=service; this.limiter=limiter; }
  @Schema(name="AuthLoginRequest")
  public record LoginRequest(@NotBlank @Email @Size(max=254) String email,@NotBlank @Size(max=100) String password) {}
  @Schema(name="AuthRefreshRequest")
  public record RefreshRequest(@NotBlank @Size(max=4096) String refreshToken) {}
  @Schema(name="AuthTokenResponse")
  public record TokenResponse(String accessToken,String refreshToken,String tokenType) {}
  @PostMapping("/login")
  TokenResponse login(@Valid @RequestBody LoginRequest r, HttpServletRequest request) { limiter.check(r.email().strip().toLowerCase(java.util.Locale.ROOT),request.getRemoteAddr()); return service.login(r.email(),r.password()); }
  @PostMapping("/refresh")
  TokenResponse refresh(@Valid @RequestBody RefreshRequest r) { return service.refresh(r.refreshToken()); }
  @PostMapping("/logout") @ResponseStatus(HttpStatus.NO_CONTENT)
  void logout(@Valid @RequestBody RefreshRequest r, @RequestHeader(value="Authorization",required=false) String authorization) { service.logout(r.refreshToken(),authorization); }
}
