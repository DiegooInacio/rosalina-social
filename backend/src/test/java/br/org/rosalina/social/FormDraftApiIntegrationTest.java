package br.org.rosalina.social;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.UUID;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class FormDraftApiIntegrationTest {
  @Container static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");
  @DynamicPropertySource static void db(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", postgres::getJdbcUrl);
    registry.add("spring.datasource.username", postgres::getUsername);
    registry.add("spring.datasource.password", postgres::getPassword);
  }

  private static final String DRAFTS = "/api/v1/form-drafts";
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;
  @Autowired JdbcTemplate jdbc;
  String admin;
  String owner;

  @BeforeEach void login() throws Exception {
    admin = token("admin@rosalina.local", "admin12345");
    owner = operator();
  }

  String token(String email, String password) throws Exception {
    return read(mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
        .content(json.createObjectNode().put("email", email).put("password", password).toString()))
        .andExpect(status().isOk())).get("accessToken").asText();
  }

  String operator() throws Exception {
    String email = UUID.randomUUID() + "@draft.local";
    var user = json.createObjectNode().put("name", "Operador de teste").put("email", email)
        .put("role", "OPERADOR").put("password", "senha-segura");
    mvc.perform(post("/api/v1/users").header("Authorization", "Bearer " + admin)
        .contentType(MediaType.APPLICATION_JSON).content(user.toString())).andExpect(status().isCreated());
    return token(email, "senha-segura");
  }

  JsonNode read(ResultActions result) throws Exception {
    return json.readTree(result.andReturn().getResponse().getContentAsString());
  }

  ObjectNode object(String value) throws Exception { return (ObjectNode) json.readTree(value); }

  JsonNode create(String formType, ObjectNode data) throws Exception {
    var body = json.createObjectNode().put("formType", formType).put("title", "Preenchimento parcial");
    body.set("data", data);
    return read(mvc.perform(post(DRAFTS).header("Authorization", "Bearer " + owner)
        .contentType(MediaType.APPLICATION_JSON).content(body.toString()))
        .andExpect(status().isCreated()).andExpect(header().exists("Location")));
  }

  ObjectNode updateBody(long version, String name) {
    var body = json.createObjectNode().put("version", version).put("title", name);
    body.set("data", json.createObjectNode().put("name", name));
    return body;
  }

  ObjectNode completion(long version, ObjectNode submission) {
    PopulationChoicesFixture.fill(submission, jdbc);
    var body = json.createObjectNode().put("version", version);
    body.set("submission", submission);
    return body;
  }

  ResultActions finish(String id, ObjectNode body, String token) throws Exception {
    return mvc.perform(post(DRAFTS + "/" + id + "/complete").header("Authorization", "Bearer " + token)
        .contentType(MediaType.APPLICATION_JSON).content(body.toString()));
  }

  @Test void classificationsMayBeBlankInDraftButAreRequiredAtCompletion() throws Exception {
    ObjectNode raw = object("{\"responsible\":{\"name\":\"Maria\"}}");
    var draft = create("POPULATION_SURVEY", raw);
    String id = draft.get("id").asText();
    var request = json.createObjectNode().put("version", 0);
    request.set("submission", raw);
    var error = read(finish(id, request, owner).andExpect(status().isBadRequest()));
    PopulationChoicesFixture.FIELDS.keySet().forEach(field -> assertTrue(error.get("fields").has("responsible." + field)));
    mvc.perform(get(DRAFTS + "/" + id).header("Authorization", "Bearer " + owner))
        .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("DRAFT")).andExpect(jsonPath("$.data.responsible.name").value("Maria"));
    finish(id, completion(0, raw), owner).andExpect(status().isOk());
  }

  @Test void preservesRawIncompleteDataForBothFormsWithoutCreatingRecords() throws Exception {
    int students = jdbc.queryForObject("select count(*) from student", Integer.class);
    int surveys = jdbc.queryForObject("select count(*) from population_survey", Integer.class);
    ObjectNode raw = object("""
        {"name":"Ana", "birthDate":"31/0", "cpf":"529.", "age":"", "income":"12,",
         "members":[{"name":"", "income":""}], "health":{"allergies":"Dado de saúde"}}
        """);
    for (String type : new String[]{"STUDENT", "POPULATION_SURVEY"}) {
      var created = create(type, raw);
      assertEquals(0, created.get("version").asLong());
      assertEquals("DRAFT", created.get("status").asText());
      var recovered = read(mvc.perform(get(DRAFTS + "/" + created.get("id").asText())
          .header("Authorization", "Bearer " + owner)).andExpect(status().isOk()));
      assertEquals(raw, recovered.get("data"));
      assertEquals(0, jdbc.queryForObject("select count(*) from audit_event where entity_id = ? and metadata like '%Dado de saúde%'", Integer.class, UUID.fromString(created.get("id").asText())));
    }
    assertEquals(students, jdbc.queryForObject("select count(*) from student", Integer.class));
    assertEquals(surveys, jdbc.queryForObject("select count(*) from population_survey", Integer.class));
    mvc.perform(get(DRAFTS).param("formType", "STUDENT").param("size", "1000").header("Authorization", "Bearer " + owner))
        .andExpect(status().isOk()).andExpect(jsonPath("$.size").value(100))
        .andExpect(jsonPath("$.content", hasSize(1))).andExpect(jsonPath("$.content[0].data").doesNotExist());
  }

  @Test void updatesOnlyWithCurrentVersionAndRejectsStaleDiscard() throws Exception {
    var created = create("STUDENT", object("{}"));
    String id = created.get("id").asText();
    var saved = read(mvc.perform(put(DRAFTS + "/" + id).header("Authorization", "Bearer " + owner)
        .contentType(MediaType.APPLICATION_JSON).content(updateBody(0, "Atualizado").toString())).andExpect(status().isOk()));
    assertEquals(1, saved.get("version").asLong());
    mvc.perform(put(DRAFTS + "/" + id).header("Authorization", "Bearer " + owner)
        .contentType(MediaType.APPLICATION_JSON).content(updateBody(0, "Antigo").toString())).andExpect(status().isConflict());
    mvc.perform(delete(DRAFTS + "/" + id).param("version", "0").header("Authorization", "Bearer " + owner)).andExpect(status().isConflict());
    finish(id, completion(0, object("{}")), owner).andExpect(status().isConflict());
    mvc.perform(get(DRAFTS + "/" + id).header("Authorization", "Bearer " + owner))
        .andExpect(status().isOk()).andExpect(jsonPath("$.data.name").value("Atualizado"));
    mvc.perform(delete(DRAFTS + "/" + id).param("version", "1").header("Authorization", "Bearer " + owner)).andExpect(status().isNoContent());
    mvc.perform(get(DRAFTS + "/" + id).header("Authorization", "Bearer " + owner)).andExpect(status().isNotFound());
  }

  @Test void isolatesDraftsFromOtherOperatorsAndEvenAdministrators() throws Exception {
    String id = create("POPULATION_SURVEY", object("{\"secret\":\"Privado\"}")).get("id").asText();
    for (String other : new String[]{operator(), admin}) {
      mvc.perform(get(DRAFTS).header("Authorization", "Bearer " + other)).andExpect(status().isOk())
          .andExpect(jsonPath("$.content[*].id", not(hasItem(id))));
      mvc.perform(get(DRAFTS + "/" + id).header("Authorization", "Bearer " + other)).andExpect(status().isNotFound());
      mvc.perform(put(DRAFTS + "/" + id).header("Authorization", "Bearer " + other)
          .contentType(MediaType.APPLICATION_JSON).content(updateBody(0, "Intruso").toString())).andExpect(status().isNotFound());
      mvc.perform(delete(DRAFTS + "/" + id).param("version", "0").header("Authorization", "Bearer " + other)).andExpect(status().isNotFound());
      finish(id, completion(0, object("{\"responsible\":{\"name\":\"Maria\"}}")), other).andExpect(status().isNotFound());
    }
    mvc.perform(get(DRAFTS + "/" + id)).andExpect(status().isUnauthorized());
    mvc.perform(post(DRAFTS).contentType(MediaType.APPLICATION_JSON).content("{} ")).andExpect(status().isUnauthorized());
    mvc.perform(delete(DRAFTS + "/" + id).param("version", "0")).andExpect(status().isUnauthorized());
  }

  @Test void failedCompletionValidatesFullRequestAndKeepsDraftUntouched() throws Exception {
    var raw = object("{\"responsible\":{\"birthDate\":\"31/02\"}}");
    String id = create("POPULATION_SURVEY", raw).get("id").asText();
    finish(id, completion(0, object("{}")), owner).andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.responsible").exists());
    finish(id, completion(0, object("{\"responsible\":{\"name\":\"Maria\",\"birthDate\":\"2026-02-31\"}}")), owner)
        .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields", hasKey("responsible.birthDate")));
    finish(id, completion(0, object("{\"responsible\":{\"name\":\"Maria\"},\"workAndBenefits\":{\"works\":false,\"occupation\":\"Inválido\"}}")), owner)
        .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields", hasKey("workAndBenefits.occupation")));
    var recovered = read(mvc.perform(get(DRAFTS + "/" + id).header("Authorization", "Bearer " + owner)).andExpect(status().isOk()));
    assertEquals(raw, recovered.get("data"));
    assertEquals(0, recovered.get("version").asLong());
    assertEquals("DRAFT", recovered.get("status").asText());
    String student = create("STUDENT", object("{} ")).get("id").asText();
    finish(student, completion(0, object("{}")), owner).andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields", hasKey("name")));
  }

  @Test void completesSurveyAtomicallyAndRetainsOnlyAnIdempotentReceipt() throws Exception {
    String id = create("POPULATION_SURVEY", object("{\"secret\":\"Não duplicar no recibo\"}")).get("id").asText();
    ObjectNode body = completion(0, object("{\"responsible\":{\"name\":\"Maria\"}}"));
    JsonNode completed = read(finish(id, body, owner).andExpect(status().isOk()));
    assertEquals(completed, read(finish(id, body, owner).andExpect(status().isOk())));
    UUID record = UUID.fromString(completed.get("recordId").asText());
    assertEquals("Maria", jdbc.queryForObject("select responsible_name from population_survey where id = ?", String.class, record));
    var receipt = read(mvc.perform(get(DRAFTS + "/" + id).header("Authorization", "Bearer " + owner)).andExpect(status().isOk()));
    assertEquals("COMPLETED", receipt.get("status").asText());
    assertEquals(object("{}"), receipt.get("data"));
    assertFalse(receipt.hasNonNull("title"));
    mvc.perform(get(DRAFTS).header("Authorization", "Bearer " + owner)).andExpect(status().isOk()).andExpect(jsonPath("$.content", hasSize(0)));
    mvc.perform(put(DRAFTS + "/" + id).header("Authorization", "Bearer " + owner)
        .contentType(MediaType.APPLICATION_JSON).content(updateBody(receipt.get("version").asLong(), "Não reabrir").toString())).andExpect(status().isConflict());
    mvc.perform(delete(DRAFTS + "/" + id).param("version", receipt.get("version").asText()).header("Authorization", "Bearer " + owner)).andExpect(status().isConflict());
  }

  @Test void completesStudentWithExistingCatalogAndBusinessValidation() throws Exception {
    JsonNode activity = read(mvc.perform(post("/api/v1/catalogs").header("Authorization", "Bearer " + admin)
        .contentType(MediaType.APPLICATION_JSON).content("{\"category\":\"ATIVIDADE\",\"name\":\"Atividade " + UUID.randomUUID() + "\"}")).andExpect(status().isCreated()));
    String id = create("STUDENT", object("{\"name\":\"Parcial\"}")).get("id").asText();
    var submission = object("{\"status\":\"ATIVO\",\"name\":\"Ana\",\"birthDate\":\"2015-05-20\",\"guardianPhone\":\"85999999999\",\"relatives\":[{\"type\":\"RESPONSAVEL\",\"name\":\"Maria\"}]}");
    submission.put("activityId", activity.get("id").asText());
    submission.put("cpf", "11111111111");
    finish(id, completion(0, submission), owner).andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.cpf").exists());
    submission.remove("cpf");
    var completed = read(finish(id, completion(0, submission), owner).andExpect(status().isOk()));
    mvc.perform(get("/api/v1/students/" + completed.get("recordId").asText()).header("Authorization", "Bearer " + owner))
        .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Ana"))
        .andExpect(jsonPath("$.activity.id").value(activity.get("id").asText()));
  }

  @Test void rejectsInvalidEnvelopeOversizedDataAndMissingVersion() throws Exception {
    mvc.perform(post(DRAFTS).header("Authorization", "Bearer " + owner).contentType(MediaType.APPLICATION_JSON)
        .content("{\"formType\":\"STUDENT\",\"data\":[]}")).andExpect(status().isBadRequest());
    mvc.perform(post(DRAFTS).header("Authorization", "Bearer " + owner).contentType(MediaType.APPLICATION_JSON)
        .content("{\"formType\":\"UNKNOWN\",\"data\":{}}")).andExpect(status().isBadRequest());
    var large = json.createObjectNode().put("formType", "STUDENT");
    large.set("data", json.createObjectNode().put("text", "a".repeat(256 * 1024)));
    mvc.perform(post(DRAFTS).header("Authorization", "Bearer " + owner).contentType(MediaType.APPLICATION_JSON).content(large.toString()))
        .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.data").exists());
    String id = create("STUDENT", object("{}")).get("id").asText();
    mvc.perform(delete(DRAFTS + "/" + id).header("Authorization", "Bearer " + owner))
        .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.version").exists());
    mvc.perform(delete(DRAFTS + "/" + id).param("version", "-1").header("Authorization", "Bearer " + owner))
        .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.version").exists());
    mvc.perform(put(DRAFTS + "/" + id).header("Authorization", "Bearer " + owner).contentType(MediaType.APPLICATION_JSON)
        .content(updateBody(-1, "Inválido").toString())).andExpect(status().isBadRequest());
    mvc.perform(get(DRAFTS).param("sort", "data").header("Authorization", "Bearer " + owner)).andExpect(status().isBadRequest());
  }

  @Test void corsAllowsDiscardFromFrontend() throws Exception {
    mvc.perform(options(DRAFTS + "/" + UUID.randomUUID()).header("Origin", "http://localhost:5173")
        .header("Access-Control-Request-Method", "DELETE").header("Access-Control-Request-Headers", "Authorization"))
        .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Methods", containsString("DELETE")));
  }

  @Test void concurrentCompletionCreatesExactlyOneRecord() throws Exception {
    String id = create("POPULATION_SURVEY", object("{}")).get("id").asText();
    String uniqueName = "Concorrente " + UUID.randomUUID();
    var submission = json.createObjectNode();
    submission.set("responsible", json.createObjectNode().put("name", uniqueName));
    PopulationChoicesFixture.fill(submission, jdbc);
    String body = completion(0, submission).toString();
    CountDownLatch start = new CountDownLatch(1);
    try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
      var first = executor.submit(() -> concurrentFinish(id, body, start));
      var second = executor.submit(() -> concurrentFinish(id, body, start));
      start.countDown();
      MvcResult a = first.get(30, TimeUnit.SECONDS), b = second.get(30, TimeUnit.SECONDS);
      assertEquals(200, a.getResponse().getStatus());
      assertEquals(200, b.getResponse().getStatus());
      assertEquals(json.readTree(a.getResponse().getContentAsString()).get("recordId"), json.readTree(b.getResponse().getContentAsString()).get("recordId"));
    }
    assertEquals(1, jdbc.queryForObject("select count(*) from population_survey where responsible_name = ?", Integer.class, uniqueName));
  }

  private MvcResult concurrentFinish(String id, String body, CountDownLatch start) throws Exception {
    start.await();
    return mvc.perform(post(DRAFTS + "/" + id + "/complete").header("Authorization", "Bearer " + owner)
        .contentType(MediaType.APPLICATION_JSON).content(body)).andReturn();
  }

  @Test void simultaneousAutosavesDoNotSilentlyOverwriteEachOther() throws Exception {
    String id = create("STUDENT", object("{}")).get("id").asText();
    CountDownLatch start = new CountDownLatch(1);
    try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
      var first = executor.submit(() -> concurrentUpdate(id, "Primeira aba", start));
      var second = executor.submit(() -> concurrentUpdate(id, "Segunda aba", start));
      start.countDown();
      int a = first.get(30, TimeUnit.SECONDS), b = second.get(30, TimeUnit.SECONDS);
      assertEquals(Set.of(200, 409), Set.of(a, b));
    }
    var saved = read(mvc.perform(get(DRAFTS + "/" + id).header("Authorization", "Bearer " + owner)).andExpect(status().isOk()));
    assertEquals(1, saved.get("version").asLong());
    assertTrue(Set.of("Primeira aba", "Segunda aba").contains(saved.at("/data/name").asText()));
  }

  private int concurrentUpdate(String id, String name, CountDownLatch start) throws Exception {
    start.await();
    return mvc.perform(put(DRAFTS + "/" + id).header("Authorization", "Bearer " + owner)
        .contentType(MediaType.APPLICATION_JSON).content(updateBody(0, name).toString()))
        .andReturn().getResponse().getStatus();
  }

  @Test void creationRequestIdReusesTheOwnedDraftWithoutOverwritingEdits() throws Exception {
    String key = UUID.randomUUID().toString();
    var body = object("{\"requestId\":\"" + key + "\",\"formType\":\"STUDENT\",\"data\":{\"name\":\"Original\"}}");
    var created = read(mvc.perform(post(DRAFTS).header("Authorization", "Bearer " + owner).contentType(MediaType.APPLICATION_JSON).content(body.toString())).andExpect(status().isCreated()));
    assertEquals(key, created.get("id").asText());
    mvc.perform(put(DRAFTS + "/" + key).header("Authorization", "Bearer " + owner).contentType(MediaType.APPLICATION_JSON).content(updateBody(0, "Edição posterior").toString())).andExpect(status().isOk());
    mvc.perform(post(DRAFTS).header("Authorization", "Bearer " + owner).contentType(MediaType.APPLICATION_JSON).content(body.toString()))
        .andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(key)).andExpect(jsonPath("$.version").value(1)).andExpect(jsonPath("$.data.name").value("Edição posterior"));
    assertEquals(1, jdbc.queryForObject("select count(*) from form_draft where id = ?", Integer.class, UUID.fromString(key)));
    assertEquals(1, jdbc.queryForObject("select count(*) from audit_event where entity_id = ? and action = 'CREATE_DRAFT'", Integer.class, UUID.fromString(key)));
    String another = operator();
    mvc.perform(post(DRAFTS).header("Authorization", "Bearer " + another).contentType(MediaType.APPLICATION_JSON).content(body.toString())).andExpect(status().isConflict()).andExpect(jsonPath("$.data").doesNotExist());
    body.put("formType", "POPULATION_SURVEY");
    mvc.perform(post(DRAFTS).header("Authorization", "Bearer " + owner).contentType(MediaType.APPLICATION_JSON).content(body.toString())).andExpect(status().isBadRequest());
  }

  @Test void concurrentCreationWithTheSameRequestIdCreatesOneDraftAndOneAuditEvent() throws Exception {
    String key = UUID.randomUUID().toString();
    String body = "{\"requestId\":\"" + key + "\",\"formType\":\"POPULATION_SURVEY\",\"data\":{\"responsible\":{\"name\":\"Maria\"}}}";
    var start = new CountDownLatch(1);
    try (var executor = Executors.newFixedThreadPool(2)) {
      var requests = new java.util.ArrayList<java.util.concurrent.Future<MvcResult>>();
      for (int i = 0; i < 2; i++) requests.add(executor.submit(() -> {
        start.await();
        return mvc.perform(post(DRAFTS).header("Authorization", "Bearer " + owner).contentType(MediaType.APPLICATION_JSON).content(body)).andReturn();
      }));
      start.countDown();
      for (var request : requests) {
        var response = request.get(20, TimeUnit.SECONDS).getResponse();
        assertEquals(201, response.getStatus());
        assertEquals(key, json.readTree(response.getContentAsString()).get("id").asText());
      }
    }
    assertEquals(1, jdbc.queryForObject("select count(*) from form_draft where id = ?", Integer.class, UUID.fromString(key)));
    assertEquals(1, jdbc.queryForObject("select count(*) from audit_event where entity_id = ? and action = 'CREATE_DRAFT'", Integer.class, UUID.fromString(key)));
  }
}
