package br.org.rosalina.social;

import br.org.rosalina.social.auth.JwtService;
import br.org.rosalina.social.user.*;
import com.fasterxml.jackson.databind.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.*;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"app.auth.login-account-limit=5","app.auth.login-ip-limit=20"})
@ActiveProfiles("local")
@AutoConfigureMockMvc @Testcontainers
class AuthSecurityIntegrationTest {
  @Container static final PostgreSQLContainer<?> postgres=new PostgreSQLContainer<>("postgres:16-alpine");
  @DynamicPropertySource static void db(DynamicPropertyRegistry r) {
    r.add("spring.datasource.url",postgres::getJdbcUrl); r.add("spring.datasource.username",postgres::getUsername); r.add("spring.datasource.password",postgres::getPassword);
  }
  @Autowired org.springframework.core.env.Environment env;
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;
  @Autowired AppUserRepository users;
  @Autowired PasswordEncoder encoder;
  @Autowired JwtService jwt;
  @Autowired JdbcTemplate jdbc;
  AppUser user;
  @BeforeEach void setup() {
    jdbc.update("delete from auth_login_limit");
    user=new AppUser(); user.setName("Teste"); user.setEmail(UUID.randomUUID()+"@security.local"); user.setRole(Role.OPERADOR); user.setPasswordHash(encoder.encode("senha-original-123")); user=users.save(user);
  }
  JsonNode login() throws Exception {
    return json.readTree(mvc.perform(post("/api/v1/auth/login").contentType("application/json").content(json.writeValueAsString(Map.of("email",user.getEmail(),"password","senha-original-123")))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
  }
  ResultActions action(String path,String refresh) throws Exception {
    return mvc.perform(post("/api/v1/auth/"+path).contentType("application/json").content(json.writeValueAsString(Map.of("refreshToken",refresh))));
  }
  void deniedAccess(String access) throws Exception {
    mvc.perform(get("/api/v1/me").header("Authorization","Bearer "+access)).andExpect(status().isForbidden());
  }
  @Test void rotationRejectsReuseAndRevokesDescendantsAndAccess() throws Exception {
    var original=login(); String token=original.get("refreshToken").asText();
    var next=json.readTree(action("refresh",token).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    assertNotEquals(token,next.get("refreshToken").asText());
    assertEquals(jwt.parse(token).getExpiration(),jwt.parse(next.get("refreshToken").asText()).getExpiration());
    action("refresh",token).andExpect(status().isUnauthorized());
    action("refresh",next.get("refreshToken").asText()).andExpect(status().isUnauthorized());
    deniedAccess(next.get("accessToken").asText());
    assertEquals(1,users.findById(user.getId()).orElseThrow().getSessionVersion());
  }
  @Test void passwordChangeRevokesAccessAndRefresh() throws Exception {
    var session=login();
    mvc.perform(put("/api/v1/me/password").header("Authorization","Bearer "+session.get("accessToken").asText()).contentType("application/json")
      .content(json.writeValueAsString(Map.of("currentPassword","senha-original-123","newPassword","senha-nova-456")))).andExpect(status().isNoContent());
    deniedAccess(session.get("accessToken").asText());
    action("refresh",session.get("refreshToken").asText()).andExpect(status().isUnauthorized());
  }
  @Test void logoutRevokesAllSessionsAndRejectsInvalidCredentials() throws Exception {
    var a=login(); var b=login();
    action("logout","invalid").andExpect(status().isUnauthorized());
    action("logout",a.get("refreshToken").asText()).andExpect(status().isNoContent());
    deniedAccess(a.get("accessToken").asText()); deniedAccess(b.get("accessToken").asText());
    action("refresh",b.get("refreshToken").asText()).andExpect(status().isUnauthorized());
  }
  @Test void legacyRefreshAndExpiredStoredSessionCannotRenew() throws Exception {
    action("refresh",jwt.refresh(user)).andExpect(status().isUnauthorized());
    var session=login();
    jdbc.update("update auth_refresh_session set expires_at=current_timestamp-interval '1 second' where user_id=?",user.getId());
    action("refresh",session.get("refreshToken").asText()).andExpect(status().isUnauthorized());
  }
  @Test void accountLimitSurvivesInvalidPasswordsAndDifferentIpsAndExpires() throws Exception {
    for(int i=0;i<6;i++) {
      final int n=i;
      mvc.perform(post("/api/v1/auth/login").with(r->{r.setRemoteAddr("192.0.2."+n);return r;}).contentType("application/json")
        .content(json.writeValueAsString(Map.of("email",user.getEmail().toUpperCase(Locale.ROOT),"password","errada"))))
        .andExpect(i<5?status().isUnauthorized():status().isTooManyRequests());
    }
    jdbc.update("update auth_login_limit set window_start=current_timestamp-interval '16 minutes'");
    login();
  }
  @Test void ipLimitCannotBeEvadedByChangingEmails() throws Exception {
    for(int i=0;i<21;i++) {
      mvc.perform(post("/api/v1/auth/login").contentType("application/json").content(json.writeValueAsString(Map.of("email",UUID.randomUUID()+"@no.local","password","errada"))))
        .andExpect(i<20?status().isUnauthorized():status().isTooManyRequests());
    }
  }
  @Test void concurrentRefreshHasOnlyOneWinnerAndReuseRevokesTheWinner() throws Exception {
    String original=login().get("refreshToken").asText();
    var start=new java.util.concurrent.CountDownLatch(1);
    try(var pool=java.util.concurrent.Executors.newFixedThreadPool(2)) {
      java.util.concurrent.Callable<org.springframework.mock.web.MockHttpServletResponse> call=()->{
        start.await(); return action("refresh",original).andReturn().getResponse();
      };
      var a=pool.submit(call); var b=pool.submit(call); start.countDown();
      var first=a.get(15,java.util.concurrent.TimeUnit.SECONDS); var second=b.get(15,java.util.concurrent.TimeUnit.SECONDS);
      assertEquals(Set.of(200,401),Set.of(first.getStatus(),second.getStatus()));
      var winner=json.readTree((first.getStatus()==200?first:second).getContentAsString());
      deniedAccess(winner.get("accessToken").asText());
      action("refresh",winner.get("refreshToken").asText()).andExpect(status().isUnauthorized());
    }
  }
  @Test void logoutCanRevokeUsingValidAccessWhenRefreshIsUnavailable() throws Exception {
    var session=login();
    mvc.perform(post("/api/v1/auth/logout").header("Authorization","Bearer "+session.get("accessToken").asText()).contentType("application/json")
      .content(json.writeValueAsString(Map.of("refreshToken","expired-or-missing-session")))).andExpect(status().isNoContent());
    deniedAccess(session.get("accessToken").asText());
  }
  @Test void rejectsKnownWeakAndMissingSigningKeys() {
    assertTrue(env.getProperty("app.jwt.secret").length() >= 64, "Local profile must generate its own signing key");
    for(String key:new String[]{"","short","change-this-development-secret-to-a-base64-encoded-key-with-at-least-32-bytes"})
      assertThrows(IllegalArgumentException.class,()->new JwtService(key,30,7));
  }
}
