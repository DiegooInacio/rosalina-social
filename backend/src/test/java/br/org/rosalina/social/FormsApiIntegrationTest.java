package br.org.rosalina.social;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import java.util.UUID;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @Testcontainers
class FormsApiIntegrationTest {
  @Container static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");
  @DynamicPropertySource static void db(DynamicPropertyRegistry r) {
    r.add("spring.datasource.url", postgres::getJdbcUrl); r.add("spring.datasource.username", postgres::getUsername); r.add("spring.datasource.password", postgres::getPassword);
  }
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;
  @Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;
  @Autowired javax.sql.DataSource dataSource;
  private static final String SURVEYS = "/api/v1/population-surveys";

  private String admin() throws Exception {
    return read(mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\":\"admin@rosalina.local\",\"password\":\"admin12345\"}")).andExpect(status().isOk())).get("accessToken").asText();
  }
  private String operator(String admin) throws Exception {
    String email = UUID.randomUUID() + "@teste.local";
    mvc.perform(post("/api/v1/users").header("Authorization", "Bearer " + admin).contentType(MediaType.APPLICATION_JSON)
        .content("{\"name\":\"Operador\",\"email\":\"" + email + "\",\"role\":\"OPERADOR\",\"password\":\"senha-segura\"}")).andExpect(status().isCreated());
    return read(mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\":\"" + email + "\",\"password\":\"senha-segura\"}")).andExpect(status().isOk())).get("accessToken").asText();
  }
  private JsonNode read(ResultActions result) throws Exception { return json.readTree(result.andReturn().getResponse().getContentAsString()); }
  private ObjectNode payload(String source) throws Exception { return (ObjectNode) json.readTree(source); }
  private ObjectNode minimal() throws Exception { return PopulationChoicesFixture.fill(payload("{\"referenceDate\":\"2026-01-01\",\"responsible\":{\"name\":\"Maria\"}}"), jdbc); }
  private JsonNode create(ObjectNode body, String token) throws Exception {
    PopulationChoicesFixture.fill(body, jdbc);
    return read(mvc.perform(post(SURVEYS).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body.toString())).andExpect(status().isCreated()));
  }
  private void invalid(ObjectNode body, String token, String field) throws Exception {
    PopulationChoicesFixture.fill(body, jdbc);
    mvc.perform(post(SURVEYS).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body.toString()))
        .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields", hasKey(field)));
  }

  private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder versionedPut(String path, String token) throws Exception {
    String revision = read(mvc.perform(get(path).header("Authorization", "Bearer " + token)).andExpect(status().isOk())).get("revision").asText();
    return put(path).header("Authorization", "Bearer " + token).header("If-Match", "\"" + revision + "\"");
  }

  private ObjectNode studentBody(String token) throws Exception {
    String activity = read(mvc.perform(post("/api/v1/catalogs").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
        .content("{\"category\":\"ATIVIDADE\",\"name\":\"Edição " + UUID.randomUUID() + "\"}")).andExpect(status().isCreated())).get("id").asText();
    return payload("{\"status\":\"ATIVO\",\"name\":\"Ana\",\"activityId\":\"" + activity + "\",\"birthDate\":\"2015-05-20\",\"guardianPhone\":\"85999999999\",\"relatives\":[{\"type\":\"MAE\",\"name\":\"Maria\"}]}");
  }

  @Test void concurrentEditsAreAtomicIncludingChildOnlyChanges() throws Exception {
    String token = admin();
    for (boolean student : new boolean[]{true, false}) {
      String base = student ? "/api/v1/students" : SURVEYS;
      ObjectNode body = student ? studentBody(token) : minimal();
      if (!student) body.set("members", json.readTree("[{\"name\":\"Maria\",\"isResponsible\":true,\"income\":0}]"));
      JsonNode created = read(mvc.perform(post(base).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body.toString())).andExpect(status().isCreated()));
      String path = base + "/" + created.get("id").asText();
      String revision = "\"" + created.get("revision").asText() + "\"";
      if (!student) body.set("members", created.get("members").deepCopy());
      ObjectNode first = body.deepCopy(), second = body.deepCopy();
      if (student) {
        ((ObjectNode) first.withArray("relatives").get(0)).put("name", "Maria A");
        ((ObjectNode) second.withArray("relatives").get(0)).put("name", "Maria B");
      } else {
        ((ObjectNode) first.withArray("members").get(0)).put("income", 100);
        ((ObjectNode) second.withArray("members").get(0)).put("income", 200);
      }
      var start = new java.util.concurrent.CountDownLatch(1);
      try (var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
        var tasks = new java.util.ArrayList<java.util.concurrent.Future<Integer>>();
        for (ObjectNode candidate : new ObjectNode[]{first, second}) tasks.add(executor.submit(() -> {
          start.await();
          return mvc.perform(put(path).header("Authorization", "Bearer " + token).header("If-Match", revision).contentType(MediaType.APPLICATION_JSON).content(candidate.toString())).andReturn().getResponse().getStatus();
        }));
        start.countDown();
        var statuses = new java.util.ArrayList<Integer>();
        for (var task : tasks) statuses.add(task.get(20, java.util.concurrent.TimeUnit.SECONDS));
        statuses.sort(Integer::compareTo);
        assertEquals(java.util.List.of(200, 409), statuses);
      }
      JsonNode current = read(mvc.perform(get(path).header("Authorization", "Bearer " + token)).andExpect(status().isOk()));
      assertNotEquals(created.get("revision").asText(), current.get("revision").asText());
      mvc.perform(put(path).header("Authorization", "Bearer " + token).header("If-Match", revision).contentType(MediaType.APPLICATION_JSON).content(body.toString())).andExpect(status().isConflict());
      mvc.perform(put(path).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body.toString())).andExpect(status().is(428));
    }
  }

  @Test void editingRetainsInactiveCatalogsAndUnknownBooleansWithoutAllowingNewInactiveSelections() throws Exception {
    String token = admin();
    ObjectNode body = studentBody(token);
    JsonNode created = read(mvc.perform(post("/api/v1/students").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body.toString())).andExpect(status().isCreated()));
    String activity = body.get("activityId").asText();
    mvc.perform(patch("/api/v1/catalogs/" + activity).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content("{\"active\":false}")).andExpect(status().isOk());
    body.put("guardianPhone", "85988888888");
    JsonNode updated = read(mvc.perform(versionedPut("/api/v1/students/" + created.get("id").asText(), token).contentType(MediaType.APPLICATION_JSON).content(body.toString())).andExpect(status().isOk()));
    assertEquals(activity, updated.at("/activity/id").asText());
    assertTrue(updated.path("cadunico").isMissingNode() || updated.path("cadunico").isNull());
    assertTrue(updated.at("/relatives/0/literate").isMissingNode() || updated.at("/relatives/0/literate").isNull());
    mvc.perform(post("/api/v1/students").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body.toString())).andExpect(status().isBadRequest());

    String option = read(mvc.perform(post("/api/v1/catalogs").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
        .content("{\"category\":\"GENERO\",\"name\":\"Identidade " + UUID.randomUUID() + "\"}")).andExpect(status().isCreated())).get("id").asText();
    ObjectNode survey = minimal(); ((ObjectNode) survey.get("responsible")).put("genderIdentityId", option);
    JsonNode saved = create(survey, token);
    mvc.perform(patch("/api/v1/catalogs/" + option).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content("{\"active\":false}")).andExpect(status().isOk());
    mvc.perform(versionedPut(SURVEYS + "/" + saved.get("id").asText(), token).contentType(MediaType.APPLICATION_JSON).content(survey.toString())).andExpect(status().isOk()).andExpect(jsonPath("$.responsible.genderIdentityId").value(option));
    invalid(survey, token, "responsible.genderIdentityId");
  }

  @Test void minimumAndIndependentAuthorizationsRoundTrip() throws Exception {
    String token = operator(admin());
    var body = minimal(); body.set("authorizations", payload("{\"imageAndSound\":false,\"personalData\":true}"));
    body.set("declaration", payload("{\"location\":\"Fortaleza\",\"date\":\"2026-01-01\",\"responsibleSignatureName\":\"Maria\",\"registrarSignatureName\":\"Operador\"}"));
    var created = create(body, token);
    assertEquals(0, created.at("/financialSummary/memberCount").asInt());
    assertTrue(created.at("/financialSummary/totalIncome").isNull());
    assertTrue(created.hasNonNull("createdBy"));
    mvc.perform(get(SURVEYS + "/" + created.get("id").asText()).header("Authorization", "Bearer " + token))
        .andExpect(status().isOk()).andExpect(jsonPath("$.authorizations.imageAndSound").value(false))
        .andExpect(jsonPath("$.authorizations.personalData").value(true)).andExpect(jsonPath("$.declaration.registrarSignatureName").value("Operador"));
  }

  @Test void completeSectionsNormalizeDocumentsAndCalculateAgeAndIncome() throws Exception {
    String token = admin(); var body = minimal();
    body.set("responsible", payload("{\"name\":\" Maria \",\"birthDate\":\"1986-01-01\",\"cpf\":\"529.982.247-25\",\"phone\":\"(85) 99999-9999\",\"nis\":\"123.456\",\"email\":\"maria@teste.local\",\"documentType\":\"RG\",\"documentNumber\":\"AB-123\",\"socialName\":\"Maria\",\"birthplace\":\"Fortaleza\",\"nationality\":\"Brasileira\",\"voterRegistration\":\"123\"}"));
    body.set("address", payload("{\"street\":\"Rua A\",\"number\":\"s/n\",\"zipCode\":\"60744-390\",\"city\":\"Fortaleza\",\"state\":\"CE\",\"neighborhood\":\"Rosalina\",\"complement\":\"Casa\"}"));
    body.set("housing", payload("{\"type\":\"ALUGADA\",\"roomCount\":3,\"landlordName\":\"João\",\"landlordPhone\":\"85999999999\",\"monthsInCommunity\":12,\"monthsAtAddress\":6,\"pipedWater\":true,\"electricity\":false,\"sewage\":true,\"residentCount\":2}"));
    body.set("workAndBenefits", payload("{\"works\":true,\"occupation\":\"Autônoma\",\"receivesBenefit\":true,\"benefit\":\"Bolsa Família\",\"minhaCasaMinhaVidaRegistered\":false}"));
    body.set("health", payload("{\"hasDisability\":true,\"disabilityDescription\":\"Descrição\",\"continuousMedication\":true,\"medications\":\"Medicamento\",\"medicalCertificatePresented\":false,\"allergies\":\"Alergia\"}"));
    body.set("members", json.readTree("[{\"name\":\"Maria\",\"isResponsible\":true,\"documentType\":\"CPF\",\"documentNumber\":\"52998224725\",\"birthDate\":\"1986-01-01\",\"income\":1000.10},{\"name\":\"Filho\",\"age\":10,\"income\":0},{\"name\":\"Filha\",\"income\":0}]"));
    var created = create(body, token);
    assertEquals("52998224725", created.at("/responsible/cpf").asText());
    assertEquals("85999999999", created.at("/responsible/phone").asText());
    assertEquals("60744390", created.at("/address/zipCode").asText());
    assertEquals("AB-123", created.at("/responsible/documentNumber").asText());
    assertEquals(40, created.at("/responsible/age").asInt());
    assertEquals(333.37, created.at("/financialSummary/perCapitaIncome").asDouble());
    mvc.perform(get(SURVEYS).param("cpf", "529.982.247-25").param("name", "maria").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements", greaterThanOrEqualTo(1)));
    mvc.perform(get(SURVEYS + "/" + created.get("id").asText()).header("Authorization", "Bearer " + token))
        .andExpect(status().isOk()).andExpect(jsonPath("$.health.medications").value("Medicamento"));
  }

  @Test void editPreservesMemberIdsAndRemovalAndRollsBackInvalidEdit() throws Exception {
    String token = admin(); ObjectNode body = minimal();
    body.set("members", json.readTree("[{\"name\":\"Maria\",\"isResponsible\":true,\"income\":100},{\"name\":\"Filho\",\"income\":0}]"));
    var created = create(body, token); String id = created.get("id").asText();
    String responsibleId = created.at("/members/0/id").asText();
    body.set("members", json.readTree("[{\"id\":\"" + responsibleId + "\",\"name\":\"Maria\",\"isResponsible\":true,\"income\":200},{\"name\":\"Novo\",\"income\":20}]"));
    var updated = read(mvc.perform(versionedPut(SURVEYS + "/" + id, token).contentType(MediaType.APPLICATION_JSON).content(body.toString())).andExpect(status().isOk()));
    assertEquals(responsibleId, updated.at("/members/0/id").asText());
    assertNotEquals(created.at("/members/1/id").asText(), updated.at("/members/1/id").asText());
    body.set("members", json.readTree("[{\"id\":\"" + responsibleId + "\",\"name\":\"Maria\",\"isResponsible\":true,\"income\":999},{\"id\":\"" + UUID.randomUUID() + "\",\"name\":\"Intruso\"}]"));
    mvc.perform(versionedPut(SURVEYS + "/" + id, token).contentType(MediaType.APPLICATION_JSON).content(body.toString()))
        .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields", hasKey("members[1].id")));
    mvc.perform(get(SURVEYS + "/" + id).header("Authorization", "Bearer " + token)).andExpect(status().isOk())
        .andExpect(jsonPath("$.members[0].income").value(200)).andExpect(jsonPath("$.members[1].name").value("Novo"));
    body.set("members", json.createArrayNode());
    mvc.perform(versionedPut(SURVEYS + "/" + id, token).contentType(MediaType.APPLICATION_JSON).content(body.toString())).andExpect(status().isOk());
    mvc.perform(get(SURVEYS + "/" + id).header("Authorization", "Bearer " + token)).andExpect(jsonPath("$.members", hasSize(0)));
  }

  @Test void missingIncomeAndUnknownAgeRemainUnknown() throws Exception {
    String token = admin(); var body = minimal();
    ((ObjectNode) body.get("responsible")).put("age", 35);
    body.set("members", json.readTree("[{\"name\":\"Maria\",\"isResponsible\":true,\"income\":0},{\"name\":\"Filho\"}]"));
    var result = create(body, token);
    assertEquals(35, result.at("/responsible/age").asInt());
    assertFalse(result.at("/financialSummary/incomeComplete").asBoolean());
    assertTrue(result.at("/financialSummary/totalIncome").isNull());
    assertTrue(result.at("/financialSummary/perCapitaIncome").isNull());
  }

  @Test void invalidFormatsAndMembersHaveFieldErrors() throws Exception {
    String token = admin();
    var body = minimal(); ((ObjectNode) body.get("responsible")).put("cpf", "111.111.111-11"); invalid(body, token, "responsible.cpf");
    body = minimal(); ((ObjectNode) body.get("responsible")).put("birthDate", "2026-02-31"); invalid(body, token, "responsible.birthDate");
    body = minimal(); ((ObjectNode) body.get("responsible")).put("phone", "-------"); invalid(body, token, "responsible.phone");
    body = minimal(); ((ObjectNode) body.get("responsible")).put("email", "invalido"); invalid(body, token, "responsible.email");
    body = minimal(); body.set("address", payload("{\"zipCode\":\"123\"}")); invalid(body, token, "address.zipCode");
    body = minimal(); body.set("housing", payload("{\"type\":\"INVALIDA\"}")); invalid(body, token, "housing.type");
    body = minimal(); body.set("housing", payload("{\"roomCount\":-1}")); invalid(body, token, "housing.roomCount");
    body = minimal(); body.set("housing", payload("{\"roomCount\":1.5}")); invalid(body, token, "housing.roomCount");
    body = minimal(); ((ObjectNode) body.get("responsible")).put("age", 1.5); invalid(body, token, "responsible.age");
    body = minimal(); body.set("members", json.readTree("[{\"name\":\"Maria\",\"isResponsible\":true,\"income\":10000000000}]")); invalid(body, token, "members[0].income");
    body = minimal(); body.set("members", json.readTree("[{\"name\":\"Maria\",\"income\":0}]")); invalid(body, token, "members");
    body = minimal(); body.set("members", json.readTree("[{\"name\":\"Outra\",\"isResponsible\":true}]")); invalid(body, token, "members[0].name");
    body = minimal(); body.set("members", json.readTree("[{\"name\":\"Maria\",\"isResponsible\":true},{\"name\":\"Maria\",\"isResponsible\":true}]")); invalid(body, token, "members");
    mvc.perform(post(SURVEYS).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content("{invalid"))
        .andExpect(status().isBadRequest());
  }

  @Test void incompatibleConditionalDetailsAreRejected() throws Exception {
    String token = admin();
    String[][] cases = {{"housing", "{\"type\":\"PROPRIA\",\"landlordName\":\"João\"}", "housing.landlordName"},
        {"workAndBenefits", "{\"works\":false,\"occupation\":\"Profissão\"}", "workAndBenefits.occupation"},
        {"workAndBenefits", "{\"benefit\":\"Benefício\"}", "workAndBenefits.benefit"},
        {"health", "{\"hasDisability\":false,\"disabilityDescription\":\"Detalhe\"}", "health.disabilityDescription"},
        {"health", "{\"continuousMedication\":false,\"medications\":\"Detalhe\"}", "health.medications"}};
    for (var entry : cases) { var body = minimal(); body.set(entry[0], payload(entry[1])); invalid(body, token, entry[2]); }
  }

  @Test void operatorCatalogPermissionsAndOpenApiSchemas() throws Exception {
    String admin = admin(), operator = operator(admin);
    mvc.perform(get("/api/v1/catalogs").header("Authorization", "Bearer " + operator)).andExpect(status().isOk());
    mvc.perform(post("/api/v1/catalogs").header("Authorization", "Bearer " + operator).contentType(MediaType.APPLICATION_JSON)
        .content("{\"category\":\"ATIVIDADE\",\"name\":\"Teste\"}")).andExpect(status().isForbidden());
    mvc.perform(get(SURVEYS)).andExpect(status().isUnauthorized());
    mvc.perform(post(SURVEYS).contentType(MediaType.APPLICATION_JSON).content(minimal().toString())).andExpect(status().isUnauthorized());
    mvc.perform(get(SURVEYS + "/" + UUID.randomUUID()).header("Authorization", "Bearer " + operator)).andExpect(status().isNotFound());
    var schemas = read(mvc.perform(get("/v3/api-docs")).andExpect(status().isOk())).at("/components/schemas");
    for (String name : new String[]{"StudentRequest", "CatalogRequest", "UserRequest", "StudentStatusRequest", "CatalogStatusRequest", "UserStatusRequest", "PopulationSurveyRequest"})
      assertTrue(schemas.has(name), "Missing schema: " + name);
    assertTrue(schemas.get("StudentRequest").get("properties").has("guardianPhone"));
    assertTrue(schemas.get("UserRequest").get("properties").has("password"));
    assertFalse(schemas.get("CatalogRequest").get("properties").has("password"));
  }

  @Test void populationCatalogReferencesMustBeActiveAndCorrectCategory() throws Exception {
    String token = admin();
    var items = read(mvc.perform(get("/api/v1/catalogs").param("category", "ESCOLARIDADE").header("Authorization", "Bearer " + token)).andExpect(status().isOk()));
    String id = items.get(0).get("id").asText();
    var body = minimal(); ((ObjectNode) body.get("responsible")).put("genderIdentityId", id); invalid(body, token, "responsible.genderIdentityId");
    var catalog = read(mvc.perform(post("/api/v1/catalogs").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
        .content("{\"category\":\"GENERO\",\"name\":\"Opção " + UUID.randomUUID() + "\"}")).andExpect(status().isCreated()));
    String option = catalog.get("id").asText();
    ((ObjectNode) body.get("responsible")).put("genderIdentityId", option); create(body, token);
    mvc.perform(patch("/api/v1/catalogs/" + option).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content("{\"active\":false}")).andExpect(status().isOk());
    invalid(body, token, "responsible.genderIdentityId");
  }

  @Test void studentEditPreservesRelativesAndSocioeconomicAndValidatesFields() throws Exception {
    String token = admin();
    String activity = read(mvc.perform(post("/api/v1/catalogs").header("Authorization", "Bearer " + token)
        .contentType(MediaType.APPLICATION_JSON).content("{\"category\":\"ATIVIDADE\",\"name\":\"Atividade " + UUID.randomUUID() + "\"}")).andExpect(status().isCreated())).get("id").asText();
    var body = payload("{\"status\":\"ATIVO\",\"name\":\"Ana\",\"activityId\":\"" + activity + "\",\"birthDate\":\"2015-05-20\",\"guardianPhone\":\"(85) 99999-9999\",\"cpf\":\"529.982.247-25\",\"nis\":\"123.456\",\"rg\":\"AB-123\",\"relatives\":[{\"type\":\"RESPONSAVEL\",\"name\":\"Maria\",\"cpf\":\"529.982.247-25\"}],\"socioeconomic\":{\"householdIncome\":1000,\"hasOtherAssets\":true,\"hasVehicle\":true}}");
    var created = read(mvc.perform(post("/api/v1/students").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body.toString())).andExpect(status().isCreated()));
    UUID id = UUID.fromString(created.get("id").asText());
    UUID relative = jdbc.queryForObject("select id from student_relative where student_id = ?", UUID.class, id);
    assertEquals("52998224725", created.get("cpf").asText()); assertEquals("AB-123", created.get("rg").asText());
    ((ObjectNode) body.withArray("relatives").get(0)).put("name", "Maria Silva");
    ((ObjectNode) body.get("socioeconomic")).put("householdIncome", 1500);
    mvc.perform(versionedPut("/api/v1/students/" + id, token).contentType(MediaType.APPLICATION_JSON).content(body.toString()))
        .andExpect(status().isOk()).andExpect(jsonPath("$.relatives[0].name").value("Maria Silva"))
        .andExpect(jsonPath("$.socioeconomic.householdIncome").value(1500));
    assertEquals(relative, jdbc.queryForObject("select id from student_relative where student_id = ?", UUID.class, id));
    ((ObjectNode) body.get("socioeconomic")).put("hasOtherAssets", false);
    mvc.perform(versionedPut("/api/v1/students/" + id, token).contentType(MediaType.APPLICATION_JSON).content(body.toString()))
        .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields", hasKey("socioeconomic.hasVehicle")));
    mvc.perform(get("/api/v1/students/" + id).header("Authorization", "Bearer " + token))
        .andExpect(status().isOk()).andExpect(jsonPath("$.socioeconomic.hasOtherAssets").value(true));
    ((ObjectNode) body.get("socioeconomic")).put("hasOtherAssets", true).put("householdIncome", 10000000000L);
    mvc.perform(versionedPut("/api/v1/students/" + id, token).contentType(MediaType.APPLICATION_JSON).content(body.toString()))
        .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields", hasKey("socioeconomic.householdIncome")));
    body.remove("cpf"); body.remove("socioeconomic"); body.set("relatives", json.createArrayNode());
    mvc.perform(post("/api/v1/students").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body.toString()))
        .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields", hasKey("relatives")));
    body.set("relatives", json.readTree("[{\"type\":\"RESPONSAVEL\",\"name\":\"Maria\",\"cpf\":\"11111111111\"}]"));
    mvc.perform(post("/api/v1/students").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body.toString()))
        .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields", hasKey("relatives[0].cpf")));
  }

  @Test void studentAcceptsMotherOrFatherAndPersistsSanitationBooleans() throws Exception {
    String token = admin();
    String activity = read(mvc.perform(post("/api/v1/catalogs").header("Authorization", "Bearer " + token)
        .contentType(MediaType.APPLICATION_JSON).content("{\"category\":\"ATIVIDADE\",\"name\":\"Família " + UUID.randomUUID() + "\"}")).andExpect(status().isCreated())).get("id").asText();
    var body = payload("{\"status\":\"ATIVO\",\"name\":\"Aluno\",\"activityId\":\"" + activity + "\",\"birthDate\":\"2015-05-20\",\"guardianPhone\":\"85999999999\"}");
    for (String type : new String[]{"MAE", "PAI", "RESPONSAVEL"}) {
      body.set("relatives", json.readTree("[{\"type\":\"" + type + "\",\"name\":\"Familiar\"}]"));
      body.set("socioeconomic", payload("{\"hasWaterSupply\":true,\"hasSewage\":false,\"hasGarbageCollection\":true}"));
      var created = read(mvc.perform(post("/api/v1/students").header("Authorization", "Bearer " + token)
          .contentType(MediaType.APPLICATION_JSON).content(body.toString())).andExpect(status().isCreated()));
      assertEquals(type, created.at("/relatives/0/type").asText());
      mvc.perform(get("/api/v1/students/" + created.get("id").asText()).header("Authorization", "Bearer " + token))
          .andExpect(status().isOk()).andExpect(jsonPath("$.socioeconomic.hasWaterSupply").value(true))
          .andExpect(jsonPath("$.socioeconomic.hasSewage").value(false)).andExpect(jsonPath("$.socioeconomic.hasGarbageCollection").value(true));
      body.set("socioeconomic", payload("{\"hasWaterSupply\":false}"));
      mvc.perform(versionedPut("/api/v1/students/" + created.get("id").asText(), token)
          .contentType(MediaType.APPLICATION_JSON).content(body.toString())).andExpect(status().isOk())
          .andExpect(jsonPath("$.socioeconomic.hasWaterSupply").value(false)).andExpect(jsonPath("$.socioeconomic.hasSewage").doesNotExist());
    }
    body.set("relatives", json.readTree("[{\"type\":\"RESPONSAVEL\",\"name\":\"Responsável\"},{\"type\":\"PAI\",\"name\":\"Pai\"},{\"type\":\"MAE\",\"name\":\"Mãe\"}]"));
    mvc.perform(post("/api/v1/students").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body.toString()))
        .andExpect(status().isCreated()).andExpect(jsonPath("$.relatives[0].type").value("MAE"))
        .andExpect(jsonPath("$.relatives[1].type").value("PAI")).andExpect(jsonPath("$.relatives[2].type").value("RESPONSAVEL"));
    body.set("relatives", json.createArrayNode());
    mvc.perform(post("/api/v1/students").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body.toString()))
        .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields", hasKey("relatives")));
  }

  @Test void updateAuditRecordsActorWithoutCopyingSensitiveSections() throws Exception {
    String token = operator(admin()); var body = minimal();
    body.set("health", payload("{\"allergies\":\"Informação sensível\"}"));
    var created = create(body, token); UUID id = UUID.fromString(created.get("id").asText());
    mvc.perform(versionedPut(SURVEYS + "/" + id, token).contentType(MediaType.APPLICATION_JSON).content(body.toString())).andExpect(status().isOk());
    assertEquals(2, jdbc.queryForObject("select count(*) from audit_event where entity_id = ? and entity_type = 'POPULATION_SURVEY' and actor_id = ?", Integer.class, id, UUID.fromString(created.get("createdBy").asText())));
    assertEquals(0, jdbc.queryForObject("select count(*) from audit_event where entity_id = ? and metadata like '%Informação sensível%'", Integer.class, id));
  }

  @Test void authorizationResponsesHaveIndependentTransactionalAuditWithoutSensitivePayload() throws Exception {
    String token = operator(admin()); var body = minimal();
    body.set("health", payload("{\"allergies\":\"Dado de saúde privado\"}"));
    body.set("authorizations", payload("{\"imageAndSound\":false,\"personalData\":true}"));
    var created = create(body, token); UUID id = UUID.fromString(created.get("id").asText());
    var initial = json.readTree(jdbc.queryForObject("select metadata from audit_event where entity_id=? and action='CREATE'", String.class, id));
    assertEquals("REFUSED", initial.at("/authorizations/current/imageAndSound").asText());
    assertEquals("GRANTED", initial.at("/authorizations/current/personalData").asText());
    body.set("authorizations", payload("{\"imageAndSound\":false,\"personalData\":false}"));
    mvc.perform(versionedPut(SURVEYS + "/" + id, token).contentType(MediaType.APPLICATION_JSON).content(body.toString()))
        .andExpect(status().isOk()).andExpect(jsonPath("$.authorizations.imageAndSound").value(false))
        .andExpect(jsonPath("$.authorizations.personalData").value(false));
    var changed = json.readTree(jdbc.queryForObject("select metadata from audit_event where entity_id=? and action='UPDATE'", String.class, id));
    assertEquals("GRANTED", changed.at("/authorizations/previous/personalData").asText());
    assertEquals("REFUSED", changed.at("/authorizations/current/personalData").asText());
    assertEquals("REFUSED", changed.at("/authorizations/current/imageAndSound").asText());
    assertFalse(changed.toString().contains("Dado de saúde privado"));
    assertEquals(2, jdbc.queryForObject("select count(*) from audit_event where entity_id=? and actor_id=? and occurred_at is not null", Integer.class, id, UUID.fromString(created.get("createdBy").asText())));
    body.set("authorizations", payload("{\"imageAndSound\":true,\"personalData\":true}"));
    body.set("health", payload("{\"hasDisability\":false,\"disabilityDescription\":\"Inválido\"}"));
    mvc.perform(versionedPut(SURVEYS + "/" + id, token).contentType(MediaType.APPLICATION_JSON).content(body.toString())).andExpect(status().isBadRequest());
    assertEquals(2, jdbc.queryForObject("select count(*) from audit_event where entity_id=?", Integer.class, id));
    mvc.perform(get(SURVEYS + "/" + id).header("Authorization", "Bearer " + token))
        .andExpect(status().isOk()).andExpect(jsonPath("$.authorizations.personalData").value(false));
    body.remove("health"); body.remove("authorizations");
    mvc.perform(versionedPut(SURVEYS + "/" + id, token).contentType(MediaType.APPLICATION_JSON).content(body.toString())).andExpect(status().isOk());
    assertEquals(1, jdbc.queryForObject("select count(*) from audit_event where entity_id=? and metadata like '%UNSPECIFIED%'", Integer.class, id));
  }

  @Test void allSixClassificationsAreRequiredOnCreateAndUpdate() throws Exception {
    String token = admin(); var created = create(minimal(), token);
    for (String field : PopulationChoicesFixture.FIELDS.keySet()) {
      var missing = minimal(); ((ObjectNode) missing.get("responsible")).remove(field);
      mvc.perform(post(SURVEYS).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(missing.toString()))
          .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields", hasKey("responsible." + field)));
      mvc.perform(versionedPut(SURVEYS + "/" + created.get("id").asText(), token).contentType(MediaType.APPLICATION_JSON).content(missing.toString()))
          .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields", hasKey("responsible." + field)));
    }
  }

  @Test void approvedPopulationOptionsAreAvailableAndExplicitUnknownIsPersisted() throws Exception {
    String token = operator(admin());
    String[] categories = {"SEXO_NASCIMENTO", "IDENTIFICACAO_RACIAL", "GENERO", "ORIENTACAO_SEXUAL", "ESTADO_CIVIL", "TIPO_ESCOLA"};
    for (String category : categories) {
      var response = mvc.perform(get("/api/v1/catalogs").param("category", category).header("Authorization", "Bearer " + token))
          .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
      var options = json.readTree(response);
      assertTrue(options.size() >= 4);
      assertTrue(java.util.stream.StreamSupport.stream(options.spliterator(), false).anyMatch(item -> item.get("name").asText().equals("Não informado") && item.get("active").asBoolean()));
    }
    UUID unknown = jdbc.queryForObject("select id from catalog_item where category='GENERO' and name='Não informado'", UUID.class);
    var body = minimal();
    ((com.fasterxml.jackson.databind.node.ObjectNode) body.get("responsible")).put("genderIdentityId", unknown.toString());
    var created = create(body, token);
    assertEquals(unknown.toString(), created.at("/responsible/genderIdentityId").asText());
    var missing = minimal(); ((ObjectNode) missing.get("responsible")).remove("genderIdentityId");
    mvc.perform(post(SURVEYS).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(missing.toString()))
        .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields", hasKey("responsible.genderIdentityId")));
  }

  @Test void migrateExistingVersionTwoDatabasePreservesRecordsAndSeedsWithoutDuplicates() throws Exception {
    org.flywaydb.core.Flyway.configure().dataSource(dataSource).schemas("upgrade_test").defaultSchema("upgrade_test").target("2").load().migrate();
    UUID user = UUID.randomUUID(), activity = UUID.randomUUID(), student = UUID.randomUUID();
    jdbc.update("insert into upgrade_test.app_user(id,name,email,password_hash,role) values(?, 'Existente', 'existente@teste.local', 'hash', 'ADMIN')", user);
    jdbc.update("insert into upgrade_test.catalog_item(id,category,name) values(?, 'ATIVIDADE', 'Existente')", activity);
    jdbc.update("insert into upgrade_test.catalog_item(category,name) values('OCUPACAO', 'CTPS')");
    jdbc.update("insert into upgrade_test.student(id,status,name,activity_id,birth_date,guardian_phone) values(?, 'ATIVO', 'Aluno existente', ?, '2015-05-20', '85999999999')", student, activity);
    UUID water = UUID.randomUUID(), sewage = UUID.randomUUID(), garbage = UUID.randomUUID();
    jdbc.update("insert into upgrade_test.catalog_item(id,category,name) values(?, 'AGUA', 'Sim'), (?, 'ESGOTO', 'Não'), (?, 'COLETA_LIXO', 'Coleta pública')", water, sewage, garbage);
    jdbc.update("insert into upgrade_test.socioeconomic_profile(student_id, water_supply_id, sewage_id, garbage_collection_id) values(?, ?, ?, ?)", student, water, sewage, garbage);
    UUID existingGender = UUID.randomUUID();
    jdbc.update("insert into upgrade_test.catalog_item(id,category,name,active) values(?, 'GENERO', 'MULHER CISGÊNERO', false)", existingGender);
    var flyway = org.flywaydb.core.Flyway.configure().dataSource(dataSource).schemas("upgrade_test").defaultSchema("upgrade_test").load();
    assertEquals(8, flyway.migrate().migrationsExecuted);
    assertEquals(0, flyway.migrate().migrationsExecuted);
    assertEquals(1, jdbc.queryForObject("select count(*) from upgrade_test.catalog_item where category='GENERO' and lower(name)='mulher cisgênero'", Integer.class));
    assertEquals(false, jdbc.queryForObject("select active from upgrade_test.catalog_item where id=?", Boolean.class, existingGender));
    assertEquals(6, jdbc.queryForObject("select count(*) from upgrade_test.catalog_item where name='Não informado'", Integer.class));
    assertEquals(Boolean.TRUE, jdbc.queryForObject("select has_water_supply from upgrade_test.socioeconomic_profile where student_id = ?", Boolean.class, student));
    assertEquals(Boolean.FALSE, jdbc.queryForObject("select has_sewage from upgrade_test.socioeconomic_profile where student_id = ?", Boolean.class, student));
    assertNull(jdbc.queryForObject("select has_garbage_collection from upgrade_test.socioeconomic_profile where student_id = ?", Boolean.class, student));
    assertEquals(garbage, jdbc.queryForObject("select garbage_collection_id from upgrade_test.socioeconomic_profile where student_id = ?", UUID.class, student));
    assertEquals("Aluno existente", jdbc.queryForObject("select name from upgrade_test.student where id = ?", String.class, student));
    assertEquals(1, jdbc.queryForObject("select count(*) from upgrade_test.catalog_item where category = 'OCUPACAO' and name = 'CTPS'", Integer.class));
    assertNotNull(jdbc.queryForObject("select to_regclass('upgrade_test.population_survey')", String.class));
    assertNotNull(jdbc.queryForObject("select to_regclass('upgrade_test.form_draft')", String.class));
  }
}
