package br.org.rosalina.social.config;

import com.zaxxer.hikari.HikariDataSource;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration(proxyBeanMethods = false)
@Profile("heroku")
public class HerokuDatabaseConfig {
  @Bean
  HikariDataSource herokuDataSource(@Value("${DATABASE_URL}") String databaseUrl) {
    Connection connection = parse(databaseUrl);
    HikariDataSource dataSource = new HikariDataSource();
    dataSource.setJdbcUrl(connection.jdbcUrl());
    dataSource.setUsername(connection.username());
    dataSource.setPassword(connection.password());
    dataSource.setMaximumPoolSize(5);
    dataSource.setMinimumIdle(1);
    dataSource.setConnectionTimeout(10000);
    return dataSource;
  }

  // Não inclui a URL original nas exceções, pois ela contém credenciais.
  static Connection parse(String value) {
    try {
      if (value == null) throw new IllegalArgumentException();
      URI uri = URI.create(value);
      if (!("postgres".equals(uri.getScheme()) || "postgresql".equals(uri.getScheme()))
          || uri.getHost() == null || uri.getRawUserInfo() == null
          || uri.getRawPath() == null || uri.getRawPath().length() <= 1 || uri.getFragment() != null)
        throw new IllegalArgumentException();
      String[] credentials = uri.getRawUserInfo().split(":", 2);
      if (credentials.length != 2 || credentials[0].isEmpty() || credentials[1].isEmpty()) throw new IllegalArgumentException();
      String query = uri.getRawQuery();
      if (query == null || query.isEmpty()) query = "sslmode=require";
      else if (!query.matches("(?i)(?:.*&)?sslmode=[^&]*(?:&.*)?")) query += "&sslmode=require";
      String host = uri.getHost();
      if (host.contains(":") && !host.startsWith("[")) host = "[" + host + "]";
      String jdbc = "jdbc:postgresql://" + host + ":" + (uri.getPort() < 0 ? 5432 : uri.getPort()) + uri.getRawPath() + "?" + query;
      return new Connection(jdbc, decode(credentials[0]), decode(credentials[1]));
    } catch (IllegalArgumentException error) {
      throw new IllegalArgumentException("DATABASE_URL deve conter uma conexão PostgreSQL válida com usuário, senha, host e banco.");
    }
  }

  private static String decode(String value) {
    return URLDecoder.decode(value.replace("+", "%2B"), StandardCharsets.UTF_8);
  }

  record Connection(String jdbcUrl, String username, String password) {
    @Override public String toString() { return "HerokuPostgresConnection[credenciais protegidas]"; }
  }
}
