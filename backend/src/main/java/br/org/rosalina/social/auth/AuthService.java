package br.org.rosalina.social.auth;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.LockModeType;
import br.org.rosalina.social.audit.AuditService;
import br.org.rosalina.social.common.*;
import br.org.rosalina.social.user.*;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(noRollbackFor = ApiException.class)
public class AuthService {
  @PersistenceContext private EntityManager entityManager;
  private final AppUserRepository users;
  private final PasswordEncoder encoder;
  private final JwtService jwt;
  private final AuditService audit;
  private final JdbcTemplate db;
  private final String dummyHash;
  public AuthService(AppUserRepository users, PasswordEncoder encoder, JwtService jwt, AuditService audit, JdbcTemplate db) {
    this.users=users; this.encoder=encoder; this.jwt=jwt; this.audit=audit; this.db=db;
    dummyHash=encoder.encode(UUID.randomUUID().toString());
  }
  public AuthController.TokenResponse login(String email, String password) {
    email=email.strip().toLowerCase(Locale.ROOT);
    AppUser user=users.findByEmailForUpdate(email).orElse(null);
    if (user!=null) entityManager.refresh(user,LockModeType.PESSIMISTIC_WRITE);
    boolean matches=PasswordValidation.fitsBcrypt(password) && encoder.matches(password, user==null ? dummyHash : user.getPasswordHash());
    if (user==null || !user.isActive() || !matches) throw new ApiException(HttpStatus.UNAUTHORIZED,"Credenciais inválidas.");
    db.update("delete from auth_refresh_session where expires_at < current_timestamp");
    UUID session=UUID.randomUUID(), token=UUID.randomUUID();
    Instant expires=jwt.refreshDeadline();
    db.update("insert into auth_refresh_session(id,user_id,current_token_id,expires_at) values (?,?,?,?)",session,user.getId(),token,Timestamp.from(expires));
    audit.record("LOGIN","USER",user.getId());
    return tokens(user,session,token,expires);
  }
  public AuthController.TokenResponse refresh(String token) {
    Claims claims=parseRefresh(token);
    AppUser user=lockedUser(claims);
    UUID session=id(claims.get("sid",String.class)), tokenId=id(claims.getId());
    var rows=db.query("select current_token_id,expires_at from auth_refresh_session where id=? and user_id=?",
        (rs,n)->new Session(rs.getObject(1,UUID.class),rs.getTimestamp(2).toInstant()),session,user.getId());
    if (rows.isEmpty() || !rows.getFirst().expires().isAfter(Instant.now())) throw invalid();
    Session current=rows.getFirst();
    if (!current.token().equals(tokenId)) {
      revoke(user);
      audit.record("REFRESH_REUSE","USER",user.getId());
      throw invalid();
    }
    UUID next=UUID.randomUUID();
    db.update("update auth_refresh_session set current_token_id=? where id=?",next,session);
    return tokens(user,session,next,current.expires());
  }
  public void logout(String token, String authorization) {
    Claims claims;
    try { claims=parseRefresh(token); }
    catch (ApiException invalidRefresh) {
      try {
        if (authorization==null || !authorization.startsWith("Bearer ")) throw invalid();
        claims=jwt.parse(authorization.substring(7));
        if (!"access".equals(claims.get("type",String.class))) throw invalid();
      } catch (JwtException | IllegalArgumentException e) { throw invalid(); }
    }
    AppUser user=lockedUser(claims);
    // A signed refresh token is sufficient to revoke this account's sessions.
    // Also handles a logout racing with rotation of the same refresh token.
    revoke(user);
    audit.record("LOGOUT","USER",user.getId());
  }
  private void revoke(AppUser user) {
    user.invalidateSessions();
    db.update("delete from auth_refresh_session where user_id=?",user.getId());
  }
  private AppUser lockedUser(Claims claims) {
    AppUser user=users.findByEmailForUpdate(claims.getSubject()).orElseThrow(AuthService::invalid);
    entityManager.refresh(user,LockModeType.PESSIMISTIC_WRITE);
    if (!user.isActive() || !jwt.matchesSession(claims,user)) throw invalid();
    return user;
  }
  private Claims parseRefresh(String token) {
    try {
      Claims c=jwt.parse(token);
      if (!"refresh".equals(c.get("type",String.class))) throw invalid();
      id(c.get("sid",String.class)); id(c.getId());
      return c;
    } catch (JwtException | IllegalArgumentException e) { throw invalid(); }
  }
  private UUID id(String value) { try { return UUID.fromString(value); } catch (RuntimeException e) { throw invalid(); } }
  private AuthController.TokenResponse tokens(AppUser u, UUID session, UUID token, Instant expires) {
    return new AuthController.TokenResponse(jwt.access(u),jwt.refresh(u,session,token,expires),"Bearer");
  }
  private record Session(UUID token,Instant expires) {}
  private static ApiException invalid() { return new ApiException(HttpStatus.UNAUTHORIZED,"Sessão inválida ou encerrada. Entre novamente."); }
}
