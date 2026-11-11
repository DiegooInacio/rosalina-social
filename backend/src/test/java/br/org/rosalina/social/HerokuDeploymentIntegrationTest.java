package br.org.rosalina.social;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
    "JWT_SECRET=deployment-test-secret-with-at-least-32-characters",
    "BOOTSTRAP_ADMIN_EMAIL=deploy@test.local", "BOOTSTRAP_ADMIN_PASSWORD=deployment-test-password"
})
@ActiveProfiles("heroku")
@AutoConfigureMockMvc
@Testcontainers
class HerokuDeploymentIntegrationTest {
  @Container static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");
  @DynamicPropertySource static void database(DynamicPropertyRegistry registry) {
    registry.add("DATABASE_URL", () -> "postgres://" + postgres.getUsername() + ":" + postgres.getPassword()
        + "@" + postgres.getHost() + ":" + postgres.getMappedPort(5432) + "/" + postgres.getDatabaseName() + "?sslmode=disable");
  }
  @Autowired MockMvc mvc;

  @Test void permitsTheFrontendAndKeepsApiDataPrivate() throws Exception {
    for (String path : new String[]{"/login", "/app", "/app/alunos", "/app/alunos/id/editar", "/app/perfil"})
      mvc.perform(get(path)).andExpect(status().isOk()).andExpect(forwardedUrl("/index.html"));
    mvc.perform(get("/api/v1/students")).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/v1/form-drafts")).andExpect(status().isUnauthorized());
    mvc.perform(post("/app/alunos")).andExpect(status().isForbidden());
  }

  @Test void bootstrapsOnlyTheConfiguredAdministrator() throws Exception {
    mvc.perform(post("/api/v1/auth/login").contentType("application/json")
        .content("{\"email\":\"deploy@test.local\",\"password\":\"deployment-test-password\"}"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.accessToken").isString());
    mvc.perform(post("/api/v1/auth/login").contentType("application/json")
        .content("{\"email\":\"admin@rosalina.local\",\"password\":\"admin12345\"}"))
        .andExpect(status().isUnauthorized());
  }
}
