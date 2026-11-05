package br.org.rosalina.social.config;
import br.org.rosalina.social.user.*; import org.springframework.beans.factory.annotation.*; import org.springframework.boot.CommandLineRunner; import org.springframework.context.annotation.Bean; import org.springframework.security.crypto.password.PasswordEncoder;
@org.springframework.context.annotation.Configuration class BootstrapAdmin {
 @Bean CommandLineRunner bootstrap(AppUserRepository repo,PasswordEncoder encoder,@Value("${app.bootstrap.email}") String email,@Value("${app.bootstrap.password}") String password){return args->{if(repo.count()==0){br.org.rosalina.social.common.PasswordValidation.validateNew(password,"bootstrapPassword");AppUser u=new AppUser();u.setName("Administrador");u.setEmail(email);u.setPasswordHash(encoder.encode(password));u.setRole(Role.ADMIN);repo.save(u);}};}
}
