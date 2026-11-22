package djerbatourb.djerbatourb.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class MigrationRunner implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public MigrationRunner(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        try {
            System.out.println("=== Verification des migrations de base de donnees (Sport) ===");
            
            // Verifier si reservations_sport existe encore
            Integer tableExists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'reservations_sport'", 
                Integer.class
            );

            if (tableExists != null && tableExists > 0) {
                System.out.println("-> Table 'reservations_sport' detectee. Migration des donnees vers 'reservations'...");
                
                try {
                    // Transfert des donnees
                    String migrateSql = "INSERT INTO reservations (date_creation, date_debut, statut, prix_total, nombre_personnes, sport_id, utilisateur_id, nombre_materiel, nombre_heures, nombre_chambres) " +
                                        "SELECT date_creation, date_session, statut, prix_total, nombre_personnes, sport_id, utilisateur_id, nombre_materiel, nombre_heures, 1 " +
                                        "FROM reservations_sport";
                    int rows = jdbcTemplate.update(migrateSql);
                    System.out.println("✅ " + rows + " reservations de sport ont ete migrees avec succes.");
                } catch (Exception e) {
                    System.err.println("⚠️ Impossible de migrer les donnees (peut-etre deja fait ou format incompatible): " + e.getMessage());
                }

                // Suppression de la table obsolète
                jdbcTemplate.execute("DROP TABLE reservations_sport");
                System.out.println("✅ Table 'reservations_sport' supprimee avec succes.");
            } else {
                System.out.println("-> OK: La base est deja a jour (pas de table reservations_sport).");
            }
        } catch (Exception e) {
            System.err.println("⚠️ Erreur lors de la verification de migration: " + e.getMessage());
        }
    }
}
