package br.org.rosalina.social.config;

import br.org.rosalina.social.auth.JwtAuthenticationFilter;
import java.util.Arrays;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.*;

@Configuration
public class SecurityConfig {
  private static final String[] FRONTEND = {"/", "/index.html", "/assets/**", "/favicon.ico", "/vite.svg", "/login", "/app", "/app/**"};

  @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }

  @Bean SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwt, Environment env) throws Exception {
    return http.csrf(c -> c.disable()).cors(c -> {})
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(a -> {
          // Somente a interface é pública. Os dados continuam protegidos na API.
          if (env.matchesProfiles("heroku")) {
            a.requestMatchers(HttpMethod.GET, FRONTEND).permitAll();
            a.requestMatchers(HttpMethod.HEAD, FRONTEND).permitAll();
          }
          a.requestMatchers("/api/v1/auth/**", "/swagger-ui/**", "/v3/api-docs/**", "/actuator/health").permitAll()
              .requestMatchers(HttpMethod.GET, "/api/v1/catalogs/**").hasAnyRole("ADMIN", "OPERADOR")
              .requestMatchers("/api/v1/users/**", "/api/v1/catalogs/**").hasRole("ADMIN")
              .anyRequest().hasAnyRole("ADMIN", "OPERADOR");
        })
        .addFilterBefore(jwt, UsernamePasswordAuthenticationFilter.class).build();
  }

  @Bean CorsConfigurationSource corsConfigurationSource(Environment env) {
    CorsConfiguration c = new CorsConfiguration();
    c.setAllowedOrigins(Arrays.asList(env.getProperty("app.cors.allowed-origins", "").split(",")));
    c.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    c.setAllowedHeaders(List.of("Authorization", "Content-Type", "If-Match"));
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", c);
    return source;
  }
}
