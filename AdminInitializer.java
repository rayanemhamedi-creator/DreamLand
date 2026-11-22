package djerbatourb.djerbatourb.config;

import djerbatourb.djerbatourb.entity.Role;
import djerbatourb.djerbatourb.entity.Utilisateur;
import djerbatourb.djerbatourb.repository.UtilisateurRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AdminInitializer {

    @Bean
    CommandLineRunner initDatabase(UtilisateurRepository repository, PasswordEncoder encoder) {
        return args -> {
            if (repository.count() == 0 || repository.findAll().stream().noneMatch(u -> u.getRole() == Role.ADMIN)) {
                Utilisateur admin = new Utilisateur();
                admin.setNom("Admin");
                admin.setPrenom("Système");
                admin.setEmail("admin@djerbatour.com");
                admin.setMotDePasse(encoder.encode("admin123"));
                admin.setRole(Role.ADMIN);
                admin.setEstBloque(false);
                repository.save(admin);
                System.out.println("Compte ADMIN par défaut créé : admin@djerbatour.com / admin123");
            }
        };
    }
}
