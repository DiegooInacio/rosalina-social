package br.org.rosalina.social;
import org.junit.jupiter.api.Test; import org.springframework.boot.test.context.SpringBootTest; import org.springframework.test.context.DynamicPropertyRegistry; import org.springframework.test.context.DynamicPropertySource; import org.testcontainers.containers.PostgreSQLContainer; import org.testcontainers.junit.jupiter.*;
@SpringBootTest
@Testcontainers
class PostgresIntegrationTest {
 @Container static final PostgreSQLContainer<?> postgres=new PostgreSQLContainer<>("postgres:16-alpine");
 @DynamicPropertySource static void database(DynamicPropertyRegistry r){r.add("spring.datasource.url",postgres::getJdbcUrl);r.add("spring.datasource.username",postgres::getUsername);r.add("spring.datasource.password",postgres::getPassword);}
 @Test void contextStartsAndMigrationsRun() { }
}
