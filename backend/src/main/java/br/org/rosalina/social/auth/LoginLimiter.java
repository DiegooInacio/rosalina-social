package br.org.rosalina.social.auth;

import br.org.rosalina.social.common.ApiException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LoginLimiter {
  private final JdbcTemplate db;
  private final int accountLimit, ipLimit;
  public LoginLimiter(JdbcTemplate db, @Value("${app.auth.login-account-limit:10}") int accountLimit,
      @Value("${app.auth.login-ip-limit:100}") int ipLimit) {
    this.db = db; this.accountLimit = accountLimit; this.ipLimit = ipLimit;
  }
  // Committed independently: invalid credentials must not roll back the counters.
  @Transactional(propagation = Propagation.REQUIRES_NEW, noRollbackFor = ApiException.class)
  public void check(String email, String ip) {
    db.update("delete from auth_login_limit where window_start < current_timestamp - interval '1 day'");
    hit("ip:" + ip, ipLimit);
    hit("account:" + email, accountLimit);
  }
  private void hit(String value, int limit) {
    String key;
    try { key = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
    catch (java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    Integer count = db.queryForObject("""
        insert into auth_login_limit(bucket, attempts, window_start) values (?, 1, current_timestamp)
        on conflict (bucket) do update set
          attempts = case when auth_login_limit.window_start < current_timestamp - interval '15 minutes' then 1 else least(auth_login_limit.attempts + 1, 1000000) end,
          window_start = case when auth_login_limit.window_start < current_timestamp - interval '15 minutes' then current_timestamp else auth_login_limit.window_start end
        returning attempts
        """, Integer.class, key);
    if (count != null && count > limit) throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
        "Muitas tentativas de acesso. Aguarde 15 minutos antes de tentar novamente.");
  }
}
