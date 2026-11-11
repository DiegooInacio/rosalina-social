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
class RecordListingsIntegrationTest {
  @Container static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");
  @DynamicPropertySource static void db(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", postgres::getJdbcUrl);
    registry.add("spring.datasource.username", postgres::getUsername);
    registry.add("spring.datasource.password", postgres::getPassword);
  }
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;
  @Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;

  @Test void listsWithOmittedEmptyAndCombinedFiltersAndSerializesActivityOutsideTransaction() throws Exception {
    var login = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\":\"admin@rosalina.local\",\"password\":\"admin12345\"}"))
        .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    String auth = "Bearer " + json.readTree(login).get("accessToken").asText();
    var catalog = mvc.perform(post("/api/v1/catalogs").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON)
        .content("{\"category\":\"ATIVIDADE\",\"name\":\"Atividade de consulta\"}"))
        .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
    String activity = json.readTree(catalog).get("id").asText();
    for (var name : new String[]{"Ana Consulta", "Bia Consulta"}) {
      var body = json.createObjectNode().put("status", name.startsWith("Ana") ? "ATIVO" : "INATIVO")
          .put("name", name).put("activityId", activity).put("birthDate", "2015-05-20").put("guardianPhone", "85999999999");
      if (name.startsWith("Ana")) body.put("cpf", "11144477735");
      body.putArray("relatives").addObject().put("type", "MAE").put("name", "Maria");
      String created = mvc.perform(post("/api/v1/students").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON).content(body.toString()))
          .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
      mvc.perform(get("/api/v1/students/" + json.readTree(created).get("id").asText()).header("Authorization", auth))
          .andExpect(status().isOk()).andExpect(jsonPath("$.activity.name").value("Atividade de consulta"))
          .andExpect(jsonPath("$.relatives[0].name").value("Maria"));
    }
    mvc.perform(get("/api/v1/students").header("Authorization", auth).param("page", "0").param("size", "20"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2))
        .andExpect(jsonPath("$.content[0].activity").value("Atividade de consulta"));
    mvc.perform(get("/api/v1/students").header("Authorization", auth).param("name", "").param("cpf", ""))
        .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2));
    mvc.perform(get("/api/v1/students").header("Authorization", auth).param("name", "ANA").param("cpf", "111.444.777-35").param("status", "ATIVO"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.content[0].name").value("Ana Consulta"))
        .andExpect(jsonPath("$.content[0].cpf").value("***.***.777-**"));
    mvc.perform(get("/api/v1/students").header("Authorization", auth).param("status", "INATIVO"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.content[0].name").value("Bia Consulta"));
    mvc.perform(get("/api/v1/students").header("Authorization", auth).param("page", "1").param("size", "1"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.totalPages").value(2)).andExpect(jsonPath("$.content[0].name").value("Bia Consulta"));
    mvc.perform(post("/api/v1/population-surveys").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON)
        .content(PopulationChoicesFixture.fill((com.fasterxml.jackson.databind.node.ObjectNode) json.readTree("{\"responsible\":{\"name\":\"Maria Consulta\",\"cpf\":\"11144477735\"}}"), jdbc).toString()))
        .andExpect(status().isCreated());
    mvc.perform(get("/api/v1/population-surveys").header("Authorization", auth))
        .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
    mvc.perform(get("/api/v1/population-surveys").header("Authorization", auth).param("name", "").param("cpf", ""))
        .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
    mvc.perform(get("/api/v1/population-surveys").header("Authorization", auth).param("name", "MARIA").param("cpf", "11144477735"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.content[0].responsibleName").value("Maria Consulta"));
    mvc.perform(get("/api/v1/population-surveys").header("Authorization", auth).param("name", "Inexistente"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
  }
}
