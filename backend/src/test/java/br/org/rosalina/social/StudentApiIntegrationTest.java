package br.org.rosalina.social;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @Testcontainers
class StudentApiIntegrationTest {
  @Container static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");
  @DynamicPropertySource static void db(DynamicPropertyRegistry r) { r.add("spring.datasource.url", postgres::getJdbcUrl); r.add("spring.datasource.username", postgres::getUsername); r.add("spring.datasource.password", postgres::getPassword); }
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;

  @Test void adminCanCreateCatalogAndOperatorCanCreateAndInactivateStudent() throws Exception {
    String admin = token("admin@rosalina.local", "admin12345");
    String catalog = mvc.perform(post("/api/v1/catalogs").header("Authorization", "Bearer " + admin).contentType(MediaType.APPLICATION_JSON).content("{\"category\":\"ATIVIDADE\",\"name\":\"Reforço escolar\"}"))
      .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
    String activity = json.readTree(catalog).get("id").asText();
    mvc.perform(post("/api/v1/users").header("Authorization", "Bearer " + admin).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Operador\",\"email\":\"op@teste.local\",\"role\":\"OPERADOR\",\"password\":\"senha-segura\"}"))
      .andExpect(status().isCreated());
    String operator = token("op@teste.local", "senha-segura");
    String student = mvc.perform(post("/api/v1/students").header("Authorization", "Bearer " + operator).contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"ATIVO\",\"name\":\"Ana Silva\",\"activityId\":\"" + activity + "\",\"birthDate\":\"2015-05-20\",\"guardianPhone\":\"85999999999\",\"relatives\":[{\"type\":\"RESPONSAVEL\",\"name\":\"Maria Silva\"}]}"))
      .andExpect(status().isCreated()).andExpect(jsonPath("$.name").value("Ana Silva")).andReturn().getResponse().getContentAsString();
    String id = json.readTree(student).get("id").asText();
    mvc.perform(patch("/api/v1/students/" + id + "/status").header("Authorization", "Bearer " + operator).contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"INATIVO\"}"))
      .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("INATIVO"));
  }

  private String token(String email, String password) throws Exception {
    String body = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"))
      .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    return json.readTree(body).get("accessToken").asText();
  }
}
