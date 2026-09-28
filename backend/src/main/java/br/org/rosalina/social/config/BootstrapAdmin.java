package br.org.rosalina.social.config;
import br.org.rosalina.social.user.*; import org.springframework.beans.factory.annotation.*; import org.springframework.boot.CommandLineRunner; import org.springframework.context.annotation.Bean; import org.springframework.security.crypto.password.PasswordEncoder;
@org.springframework.context.annotation.Configuration class BootstrapAdmin {
 @Bean CommandLineRunner bootstrap(AppUserRepository repo,PasswordEncoder encoder,@Value("${BOOTSTRAP_ADMIN_EMAIL:admin@rosalina.local}") String email,@Value("${BOOTSTRAP_ADMIN_PASSWORD:admin12345}") String password){return args->{if(repo.count()==0){AppUser u=new AppUser();u.setName("Administrador");u.setEmail(email);u.setPasswordHash(encoder.encode(password));u.setRole(Role.ADMIN);repo.save(u);}};}
}
