package br.org.rosalina.social.auth;
import io.jsonwebtoken.*; import io.jsonwebtoken.security.Keys; import javax.crypto.SecretKey; import java.nio.charset.StandardCharsets; import java.security.MessageDigest; import java.time.*; import java.util.*; import org.springframework.beans.factory.annotation.Value; import org.springframework.stereotype.Service;
@Service public class JwtService {
 private final SecretKey key; private final long accessMinutes,refreshDays;
 public JwtService(@Value("${app.jwt.secret}") String secret,@Value("${app.jwt.access-minutes}") long a,@Value("${app.jwt.refresh-days}") long r) throws Exception {key=Keys.hmacShaKeyFor(MessageDigest.getInstance("SHA-256").digest(secret.getBytes(StandardCharsets.UTF_8)));accessMinutes=a;refreshDays=r;}
 public String access(String email,String role){return token(email,role,"access",Duration.ofMinutes(accessMinutes));} public String refresh(String email){return token(email,"","refresh",Duration.ofDays(refreshDays));}
 private String token(String email,String role,String type,Duration duration){Instant now=Instant.now();return Jwts.builder().subject(email).claim("role",role).claim("type",type).issuedAt(Date.from(now)).expiration(Date.from(now.plus(duration))).signWith(key).compact();}
 public Claims parse(String token){return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();}
}
