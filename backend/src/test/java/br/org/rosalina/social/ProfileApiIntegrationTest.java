package br.org.rosalina.social;

import br.org.rosalina.social.auth.JwtService;
import br.org.rosalina.social.user.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class ProfileApiIntegrationTest {
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
  AppUser owner;
  String token;

  @BeforeEach void setup() {
    owner = create(Role.OPERADOR);
    token = jwt.access(owner.getEmail(), owner.getRole().name());
  }

  AppUser create(Role role) {
    AppUser user = new AppUser();
    user.setName("Pessoa de teste");
    user.setEmail(UUID.randomUUID() + "@profile.local");
    user.setRole(role);
    user.setPasswordHash(encoder.encode("senha-atual-123"));
    return users.save(user);
  }

  ResultActions send(MockHttpServletRequestBuilder request, Object body) throws Exception {
    return mvc.perform(request.header("Authorization", "Bearer " + token)
        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)));
  }

  ResultActions password(String current, String next) throws Exception {
    return send(put("/api/v1/me/password"), Map.of("currentPassword", current, "newPassword", next));
  }

  @ParameterizedTest @EnumSource(Role.class)
  void bothRolesCanReadAndEditTheirOwnProfile(Role role) throws Exception {
    owner = create(role);
    token = jwt.access(owner.getEmail(), role.name());
    mvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(owner.getId().toString()))
        .andExpect(jsonPath("$.email").value(owner.getEmail())).andExpect(jsonPath("$.role").value(role.name()))
        .andExpect(jsonPath("$.passwordHash").doesNotExist()).andExpect(jsonPath("$.password").doesNotExist());
    send(patch("/api/v1/me"), Map.of("name", "  Maria Oliveira  "))
        .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Maria Oliveira"));
    assertEquals("Maria Oliveira", users.findById(owner.getId()).orElseThrow().getName());
    password("senha-atual-123", "nova-senha-123").andExpect(status().isNoContent());
  }

  @Test void updatesOnlyNameOfAuthenticatedUserEvenWithExtraFields() throws Exception {
    AppUser other = create(Role.ADMIN);
    send(patch("/api/v1/me"), Map.of("name", "Novo nome", "id", other.getId(), "email", other.getEmail(),
        "role", "ADMIN", "active", false, "passwordHash", "texto" )).andExpect(status().isOk());
    AppUser saved = users.findById(owner.getId()).orElseThrow();
    assertEquals(owner.getEmail(), saved.getEmail());
    assertEquals(Role.OPERADOR, saved.getRole());
    assertTrue(saved.isActive());
    assertEquals(owner.getPasswordHash(), saved.getPasswordHash());
    assertEquals(other.getName(), users.findById(other.getId()).orElseThrow().getName());
    assertEquals(1, jdbc.queryForObject("select count(*) from audit_event where entity_id = ? and action = 'UPDATE_PROFILE'", Integer.class, owner.getId()));
  }

  @Test void rejectsBlankMissingAndLongNamesWithoutChangingAccount() throws Exception {
    for (Object body : new Object[]{Map.of(), Map.of("name", "   "), Map.of("name", "a".repeat(151))}) {
      send(patch("/api/v1/me"), body).andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.name").exists());
    }
    assertEquals(owner.getName(), users.findById(owner.getId()).orElseThrow().getName());
    send(patch("/api/v1/me"), Map.of("name", "a".repeat(150))).andExpect(status().isOk());
  }

  @Test void wrongCurrentPasswordReturnsFieldErrorWithoutChangingPassword() throws Exception {
    password("errada", "nova-senha-123").andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.fields.currentPassword").value("Senha atual incorreta."));
    assertEquals(owner.getPasswordHash(), users.findById(owner.getId()).orElseThrow().getPasswordHash());
    mvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + token)).andExpect(status().isOk());
  }

  @Test void validatesNewPasswordAndRequiredFields() throws Exception {
    for (String next : new String[]{"", "       ", "curta", "a".repeat(101), "senha-atual-123", "á".repeat(37)}) {
      password("senha-atual-123", next).andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.newPassword").exists());
    }
    send(put("/api/v1/me/password"), Map.of("newPassword", "nova-senha-123"))
        .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.currentPassword").exists());
    send(put("/api/v1/me/password"), Map.of("currentPassword", "senha-atual-123"))
        .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.newPassword").exists());
    assertEquals(owner.getPasswordHash(), users.findById(owner.getId()).orElseThrow().getPasswordHash());
  }

  @Test void persistsPasswordHashPreservesSpacesAndChangesLoginCredentials() throws Exception {
    String next = "  nova-senha-123  ";
    password("senha-atual-123", next).andExpect(status().isNoContent()).andExpect(content().string(""));
    String hash = users.findById(owner.getId()).orElseThrow().getPasswordHash();
    assertNotEquals(next, hash);
    assertNotEquals(owner.getPasswordHash(), hash);
    assertTrue(encoder.matches(next, hash));
    assertFalse(encoder.matches(next.strip(), hash));
    send(post("/api/v1/auth/login"), Map.of("email", owner.getEmail(), "password", "senha-atual-123"))
        .andExpect(status().isUnauthorized());
    send(post("/api/v1/auth/login"), Map.of("email", owner.getEmail(), "password", next))
        .andExpect(status().isOk()).andExpect(jsonPath("$.accessToken").isString());
    assertEquals(1, jdbc.queryForObject("select count(*) from audit_event where entity_id = ? and action = 'CHANGE_PASSWORD'", Integer.class, owner.getId()));
    assertEquals(0, jdbc.queryForObject("select count(*) from audit_event where entity_id = ? and metadata like ?", Integer.class, owner.getId(), "%nova-senha%"));
  }

  @Test void rejectsAnonymousInvalidRefreshAndInactiveAccounts() throws Exception {
    mvc.perform(get("/api/v1/me")).andExpect(status().isForbidden());
    mvc.perform(patch("/api/v1/me").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Outro\"}"))
        .andExpect(status().isForbidden());
    mvc.perform(put("/api/v1/me/password").contentType(MediaType.APPLICATION_JSON).content("{}"))
        .andExpect(status().isForbidden());
    for (String invalid : new String[]{"invalid", jwt.refresh(owner.getEmail())}) {
      mvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + invalid)).andExpect(status().isForbidden());
    }
    owner.setActive(false);
    users.save(owner);
    mvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + token)).andExpect(status().isForbidden());
  }
}
