package br.org.rosalina.social;

import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;

final class PopulationChoicesFixture {
  static final Map<String,String> FIELDS=Map.of("birthSexId","SEXO_NASCIMENTO","racialIdentityId","IDENTIFICACAO_RACIAL","genderIdentityId","GENERO","sexualOrientationId","ORIENTACAO_SEXUAL","maritalStatusId","ESTADO_CIVIL","schoolTypeId","TIPO_ESCOLA");
  static ObjectNode fill(ObjectNode submission, JdbcTemplate db) {
    if (submission.get("responsible") instanceof ObjectNode responsible) {
      FIELDS.forEach((field, category)-> {
        if (!responsible.has(field)) responsible.put(field,db.queryForObject("select id from catalog_item where category=? and name='Não informado'",UUID.class,category).toString());
      });
    }
    return submission;
  }
}
