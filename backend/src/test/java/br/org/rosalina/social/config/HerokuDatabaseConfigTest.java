package br.org.rosalina.social.config;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class HerokuDatabaseConfigTest {
  @Test void translatesHerokuUrlAndEnablesSsl() {
    var connection = HerokuDatabaseConfig.parse("postgres://owner:password@host.example/db");
    assertEquals("jdbc:postgresql://host.example:5432/db?sslmode=require", connection.jdbcUrl());
    assertEquals("owner", connection.username());
    assertEquals("password", connection.password());
    assertFalse(connection.toString().contains("password"));
  }

  @Test void preservesEncodedCredentialsAndConnectionOptions() {
    var connection = HerokuDatabaseConfig.parse("postgresql://user%3Aname:pass%40word%2B+%3A@host.example:6543/db?connectTimeout=5");
    assertEquals("user:name", connection.username());
    assertEquals("pass@word++:", connection.password());
    assertEquals("jdbc:postgresql://host.example:6543/db?connectTimeout=5&sslmode=require", connection.jdbcUrl());
    assertTrue(HerokuDatabaseConfig.parse("postgres://u:p@[::1]:5432/db?sslmode=verify-full").jdbcUrl().contains("[::1]:5432/db?sslmode=verify-full"));
  }

  @Test void rejectsInvalidConfigurationWithoutLeakingCredentials() {
    for (String value : new String[]{null, "", "postgres://owner:secret@/db", "mysql://owner:secret@host/db", "postgres://host/db", "postgres://owner:secret@host/"}) {
      var error = assertThrows(IllegalArgumentException.class, () -> HerokuDatabaseConfig.parse(value));
      assertFalse(error.getMessage().contains("secret"));
      assertNull(error.getCause());
    }
  }
}
