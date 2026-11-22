package djerbatourb.djerbatourb.config;

import djerbatourb.djerbatourb.entity.Role;
import djerbatourb.djerbatourb.entity.Utilisateur;
import djerbatourb.djerbatourb.repository.UtilisateurRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UtilisateurRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UtilisateurRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        if (!userRepository.existsByEmail("admin@djerbatour.com")) {
            Utilisateur admin = new Utilisateur();
            admin.setNom("Admin");
            admin.setPrenom("Système");
            admin.setEmail("admin@djerbatour.com");
            admin.setMotDePasse(passwordEncoder.encode("admin")); // Hachage BCrypt automatique
            admin.setRole(Role.ADMIN);
            admin.setEstBloque(false);
            userRepository.save(admin);
            System.out.println("✅ Compte Admin créé avec succès : admin@djerbatour.com / admin");
        }
    }
}
