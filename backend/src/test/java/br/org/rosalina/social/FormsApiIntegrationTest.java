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
  private ObjectNode minimal() throws Exception { return payload("{\"referenceDate\":\"2026-01-01\",\"responsible\":{\"name\":\"Maria\"}}"); }
  private JsonNode create(ObjectNode body, String token) throws Exception {
    return read(mvc.perform(post(SURVEYS).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body.toString())).andExpect(status().isCreated()));
  }
  private void invalid(ObjectNode body, String token, String field) throws Exception {
    mvc.perform(post(SURVEYS).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body.toString()))
        .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields", hasKey(field)));
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
    var updated = read(mvc.perform(put(SURVEYS + "/" + id).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body.toString())).andExpect(status().isOk()));
    assertEquals(responsibleId, updated.at("/members/0/id").asText());
    assertNotEquals(created.at("/members/1/id").asText(), updated.at("/members/1/id").asText());
    body.set("members", json.readTree("[{\"id\":\"" + responsibleId + "\",\"name\":\"Maria\",\"isResponsible\":true,\"income\":999},{\"id\":\"" + UUID.randomUUID() + "\",\"name\":\"Intruso\"}]"));
    mvc.perform(put(SURVEYS + "/" + id).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body.toString()))
        .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields", hasKey("members[1].id")));
    mvc.perform(get(SURVEYS + "/" + id).header("Authorization", "Bearer " + token)).andExpect(status().isOk())
        .andExpect(jsonPath("$.members[0].income").value(200)).andExpect(jsonPath("$.members[1].name").value("Novo"));
    body.set("members", json.createArrayNode());
    mvc.perform(put(SURVEYS + "/" + id).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body.toString())).andExpect(status().isOk());
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
    mvc.perform(get(SURVEYS)).andExpect(status().isForbidden());
    mvc.perform(post(SURVEYS).contentType(MediaType.APPLICATION_JSON).content(minimal().toString())).andExpect(status().isForbidden());
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
    mvc.perform(put("/api/v1/students/" + id).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body.toString()))
        .andExpect(status().isOk()).andExpect(jsonPath("$.relatives[0].name").value("Maria Silva"))
        .andExpect(jsonPath("$.socioeconomic.householdIncome").value(1500));
    assertEquals(relative, jdbc.queryForObject("select id from student_relative where student_id = ?", UUID.class, id));
    ((ObjectNode) body.get("socioeconomic")).put("hasOtherAssets", false);
    mvc.perform(put("/api/v1/students/" + id).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body.toString()))
        .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields", hasKey("socioeconomic.hasVehicle")));
    mvc.perform(get("/api/v1/students/" + id).header("Authorization", "Bearer " + token))
        .andExpect(status().isOk()).andExpect(jsonPath("$.socioeconomic.hasOtherAssets").value(true));
    ((ObjectNode) body.get("socioeconomic")).put("hasOtherAssets", true).put("householdIncome", 10000000000L);
    mvc.perform(put("/api/v1/students/" + id).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body.toString()))
        .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields", hasKey("socioeconomic.householdIncome")));
    body.remove("cpf"); body.remove("socioeconomic"); body.set("relatives", json.createArrayNode());
    mvc.perform(post("/api/v1/students").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body.toString()))
        .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields", hasKey("relatives")));
    body.set("relatives", json.readTree("[{\"type\":\"RESPONSAVEL\",\"name\":\"Maria\",\"cpf\":\"11111111111\"}]"));
    mvc.perform(post("/api/v1/students").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body.toString()))
        .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields", hasKey("relatives[0].cpf")));
  }

  @Test void updateAuditRecordsActorWithoutCopyingSensitiveSections() throws Exception {
    String token = operator(admin()); var body = minimal();
    body.set("health", payload("{\"allergies\":\"Informação sensível\"}"));
    var created = create(body, token); UUID id = UUID.fromString(created.get("id").asText());
    mvc.perform(put(SURVEYS + "/" + id).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body.toString())).andExpect(status().isOk());
    assertEquals(2, jdbc.queryForObject("select count(*) from audit_event where entity_id = ? and entity_type = 'POPULATION_SURVEY' and actor_id = ?", Integer.class, id, UUID.fromString(created.get("createdBy").asText())));
    assertEquals(0, jdbc.queryForObject("select count(*) from audit_event where entity_id = ? and metadata like '%Informação sensível%'", Integer.class, id));
  }

  @Test void migrateExistingVersionTwoDatabasePreservesRecordsAndSeedsWithoutDuplicates() throws Exception {
    org.flywaydb.core.Flyway.configure().dataSource(dataSource).schemas("upgrade_test").defaultSchema("upgrade_test").target("2").load().migrate();
    UUID user = UUID.randomUUID(), activity = UUID.randomUUID(), student = UUID.randomUUID();
    jdbc.update("insert into upgrade_test.app_user(id,name,email,password_hash,role) values(?, 'Existente', 'existente@teste.local', 'hash', 'ADMIN')", user);
    jdbc.update("insert into upgrade_test.catalog_item(id,category,name) values(?, 'ATIVIDADE', 'Existente')", activity);
    jdbc.update("insert into upgrade_test.catalog_item(category,name) values('OCUPACAO', 'CTPS')");
    jdbc.update("insert into upgrade_test.student(id,status,name,activity_id,birth_date,guardian_phone) values(?, 'ATIVO', 'Aluno existente', ?, '2015-05-20', '85999999999')", student, activity);
    var flyway = org.flywaydb.core.Flyway.configure().dataSource(dataSource).schemas("upgrade_test").defaultSchema("upgrade_test").load();
    assertEquals(4, flyway.migrate().migrationsExecuted);
    assertEquals(0, flyway.migrate().migrationsExecuted);
    assertEquals("Aluno existente", jdbc.queryForObject("select name from upgrade_test.student where id = ?", String.class, student));
    assertEquals(1, jdbc.queryForObject("select count(*) from upgrade_test.catalog_item where category = 'OCUPACAO' and name = 'CTPS'", Integer.class));
    assertNotNull(jdbc.queryForObject("select to_regclass('upgrade_test.population_survey')", String.class));
    assertNotNull(jdbc.queryForObject("select to_regclass('upgrade_test.form_draft')", String.class));
  }
}
