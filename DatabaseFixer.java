package djerbatourb.djerbatourb.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseFixer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public DatabaseFixer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        System.out.println(" Nettoyage automatique de la base de données...");
        try {
            jdbcTemplate.execute("ALTER TABLE sorties DROP COLUMN date_debut");
            System.out.println("✅ Colonne obsolète 'date_debut' supprimée avec succès !");
        } catch (Exception e) {
            // La colonne n'existe plus ou a déjà été supprimée.
        }
        
        try {
            jdbcTemplate.execute("ALTER TABLE sorties DROP COLUMN date_fin");
            System.out.println(" Colonne obsolète 'date_fin' supprimée avec succès !");
        } catch (Exception e) {
            // Ignorer si elle n'existe pas
        }
    }
}
