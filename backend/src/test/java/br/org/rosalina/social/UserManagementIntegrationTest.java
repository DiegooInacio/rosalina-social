package br.org.rosalina.social;

import br.org.rosalina.social.auth.JwtService;
import br.org.rosalina.social.user.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @Testcontainers
class UserManagementIntegrationTest {
  @Container static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");
  @DynamicPropertySource static void db(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", postgres::getJdbcUrl);
    registry.add("spring.datasource.username", postgres::getUsername);
    registry.add("spring.datasource.password", postgres::getPassword);
  }
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;
  @Autowired AppUserRepository users;
  @Autowired PasswordEncoder encoder;
  @Autowired JwtService jwt;
  @Autowired JdbcTemplate jdbc;
  AppUser admin, operator;
  String token;
  @BeforeEach void setup() {
    admin = user(Role.ADMIN); operator = user(Role.OPERADOR); token = jwt.access(admin);
  }
  AppUser user(Role role) {
    AppUser u = new AppUser(); u.setName("Pessoa"); u.setEmail(UUID.randomUUID()+"@users.local");
    u.setRole(role); u.setPasswordHash(encoder.encode("senha-atual-123")); return users.save(u);
  }
  ResultActions send(MockHttpServletRequestBuilder request, Object body) throws Exception {
    return mvc.perform(request.header("Authorization", "Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)));
  }
  @Test void createNormalizeRejectDuplicatesAndHideSecrets() throws Exception {
    String email = UUID.randomUUID()+"@USERS.local";
    var body = Map.of("name","  Maria  ","email",email,"role","OPERADOR","password","senha-inicial-123");
    send(post("/api/v1/users"),body).andExpect(status().isCreated()).andExpect(jsonPath("$.name").value("Maria"))
        .andExpect(jsonPath("$.email").value(email.toLowerCase(Locale.ROOT))).andExpect(jsonPath("$.active").value(true))
        .andExpect(jsonPath("$.passwordHash").doesNotExist()).andExpect(jsonPath("$.password").doesNotExist());
    send(post("/api/v1/users"),body).andExpect(status().isConflict()).andExpect(jsonPath("$.fields.email").exists());
    mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("email",email,"password","senha-inicial-123"))))
        .andExpect(status().isOk());
  }
  @Test void updateRoleAndEnforcePermissionsAgainstOldToken() throws Exception {
    String oldToken = jwt.access(operator);
    send(put("/api/v1/users/"+operator.getId()),Map.of("name","  Joana  ","role","ADMIN"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Joana")).andExpect(jsonPath("$.role").value("ADMIN"));
    mvc.perform(get("/api/v1/users").header("Authorization","Bearer "+oldToken)).andExpect(status().isOk());
    send(put("/api/v1/users/"+operator.getId()),Map.of("name","Joana","role","OPERADOR")).andExpect(status().isOk());
    mvc.perform(get("/api/v1/users").header("Authorization","Bearer "+oldToken)).andExpect(status().isForbidden());
  }
  @Test void protectsSelfAndValidatesRequests() throws Exception {
    send(patch("/api/v1/users/"+admin.getId()),Map.of("active",false)).andExpect(status().isBadRequest());
    send(put("/api/v1/users/"+admin.getId()),Map.of("name","Admin","role","OPERADOR")).andExpect(status().isBadRequest());
    send(put("/api/v1/users/"+admin.getId()+"/password"),Map.of("newPassword","outra-senha-123")).andExpect(status().isBadRequest());
    send(patch("/api/v1/users/"+operator.getId()),Map.of()).andExpect(status().isBadRequest());
    for(String password : new String[]{"curta","á".repeat(37)})
      send(put("/api/v1/users/"+operator.getId()+"/password"),Map.of("newPassword",password))
          .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.newPassword").exists());
    send(put("/api/v1/users/"+UUID.randomUUID()),Map.of("name","Pessoa","role","ADMIN")).andExpect(status().isNotFound());
  }
  @Test void resetRevokesAccessAndRefreshAndAuditsWithoutPassword() throws Exception {
    String oldAccess = jwt.access(operator), oldRefresh = jwt.refresh(operator);
    String next = "  nova-senha-123  ";
    send(put("/api/v1/users/"+operator.getId()+"/password"),Map.of("newPassword",next)).andExpect(status().isNoContent());
    assertTrue(encoder.matches(next,users.findById(operator.getId()).orElseThrow().getPasswordHash()));
    mvc.perform(get("/api/v1/me").header("Authorization","Bearer "+oldAccess)).andExpect(status().isForbidden());
    send(post("/api/v1/auth/refresh"),Map.of("refreshToken",oldRefresh)).andExpect(status().isUnauthorized());
    send(post("/api/v1/auth/login"),Map.of("email",operator.getEmail(),"password","senha-atual-123")).andExpect(status().isUnauthorized());
    String response = send(post("/api/v1/auth/login"),Map.of("email",operator.getEmail(),"password",next)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    String access = json.readTree(response).get("accessToken").asText();
    mvc.perform(get("/api/v1/me").header("Authorization","Bearer "+access)).andExpect(status().isOk());
    send(post("/api/v1/auth/refresh"),Map.of("refreshToken",json.readTree(response).get("refreshToken").asText())).andExpect(status().isOk());
    assertEquals(1,jdbc.queryForObject("select count(*) from audit_event where entity_id=? and action='RESET_PASSWORD'",Integer.class,operator.getId()));
    assertEquals(0,jdbc.queryForObject("select count(*) from audit_event where entity_id=? and metadata like ?",Integer.class,operator.getId(),"%nova-senha%"));
  }
  @Test void deactivateAndReactivateNeverRestoreOldTokens() throws Exception {
    String access = jwt.access(operator), refresh = jwt.refresh(operator);
    for (boolean active : new boolean[]{false,true}) {
      send(patch("/api/v1/users/"+operator.getId()),Map.of("active",active)).andExpect(status().isOk());
      mvc.perform(get("/api/v1/me").header("Authorization","Bearer "+access)).andExpect(status().isForbidden());
      send(post("/api/v1/auth/refresh"),Map.of("refreshToken",refresh)).andExpect(status().isUnauthorized());
    }
    send(post("/api/v1/auth/login"),Map.of("email",operator.getEmail(),"password","senha-atual-123")).andExpect(status().isOk());
  }
  @Test void operatorsAndAnonymousCannotManageUsers() throws Exception {
    token = jwt.access(operator);
    send(get("/api/v1/users"),Map.of()).andExpect(status().isForbidden());
    send(post("/api/v1/users"),Map.of()).andExpect(status().isForbidden());
    send(put("/api/v1/users/"+admin.getId()),Map.of("name","Pessoa","role","ADMIN")).andExpect(status().isForbidden());
    send(patch("/api/v1/users/"+admin.getId()),Map.of("active",false)).andExpect(status().isForbidden());
    send(put("/api/v1/users/"+admin.getId()+"/password"),Map.of("newPassword","outra-senha-123")).andExpect(status().isForbidden());
    mvc.perform(get("/api/v1/users")).andExpect(status().isForbidden());
  }
}
