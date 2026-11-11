package br.org.rosalina.social.auth;
import io.jsonwebtoken.*; import io.jsonwebtoken.security.Keys; import javax.crypto.SecretKey; import java.nio.charset.StandardCharsets; import java.security.MessageDigest; import java.time.*; import java.util.*; import org.springframework.beans.factory.annotation.Value; import org.springframework.stereotype.Service;
@Service public class JwtService {
 private final SecretKey key; private final long accessMinutes,refreshDays;
 public JwtService(@Value("${app.jwt.secret}") String secret,@Value("${app.jwt.access-minutes}") long a,@Value("${app.jwt.refresh-days}") long r) throws Exception {if(secret==null || secret.getBytes(StandardCharsets.UTF_8).length<32 || secret.contains("change-this-development-secret") || secret.startsWith("gere-uma-chave")) throw new IllegalArgumentException("JWT_SECRET deve ser exclusivo e ter pelo menos 32 bytes.");key=Keys.hmacShaKeyFor(MessageDigest.getInstance("SHA-256").digest(secret.getBytes(StandardCharsets.UTF_8)));accessMinutes=a;refreshDays=r;}
 public String access(String email,String role){return token(email,role,"access",Duration.ofMinutes(accessMinutes));} public String refresh(String email){return token(email,"","refresh",Duration.ofDays(refreshDays));}
 public String access(br.org.rosalina.social.user.AppUser u){return token(u.getEmail(),u.getRole().name(),"access",Duration.ofMinutes(accessMinutes),u.getSessionVersion());}
 public String refresh(br.org.rosalina.social.user.AppUser u){return token(u.getEmail(),"","refresh",Duration.ofDays(refreshDays),u.getSessionVersion());}
 public Instant refreshDeadline(){return Instant.now().plus(Duration.ofDays(refreshDays));}
 public String refresh(br.org.rosalina.social.user.AppUser u,UUID session,UUID token,Instant expires){return Jwts.builder().subject(u.getEmail()).id(token.toString()).claim("sid",session.toString()).claim("type","refresh").claim("sessionVersion",u.getSessionVersion()).issuedAt(new Date()).expiration(Date.from(expires)).signWith(key).compact();}
 public boolean matchesSession(Claims c,br.org.rosalina.social.user.AppUser u){Object version=c.get("sessionVersion");return version==null?u.getSessionVersion()==0:version instanceof Number n&&n.longValue()==u.getSessionVersion();}
 private String token(String email,String role,String type,Duration duration){return token(email,role,type,duration,0);}
 private String token(String email,String role,String type,Duration duration,long version){Instant now=Instant.now();return Jwts.builder().subject(email).id(UUID.randomUUID().toString()).claim("role",role).claim("type",type).claim("sessionVersion",version).issuedAt(Date.from(now)).expiration(Date.from(now.plus(duration))).signWith(key).compact();}
 public Claims parse(String token){return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();}
}
