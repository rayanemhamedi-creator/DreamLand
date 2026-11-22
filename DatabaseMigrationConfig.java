package djerbatourb.djerbatourb.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;

/**
 * Correctif automatique au démarrage :
 * Met à jour l'ENUM MySQL de la colonne 'statut' pour qu'elle accepte
 * toutes les valeurs utilisées par l'application (EN_COURS, PASSEE, etc.)
 */
@Configuration
public class DatabaseMigrationConfig {

    @Autowired
    private DataSource dataSource;

    @PostConstruct
    public void fixStatutEnum() {
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {

            // Mise à jour de l'ENUM statut pour inclure toutes les valeurs
            stmt.execute(
                "ALTER TABLE reservations " +
                "MODIFY COLUMN statut ENUM('EN_ATTENTE','CONFIRMEE','EN_COURS','ANNULEE','PASSEE') " +
                "NOT NULL DEFAULT 'CONFIRMEE'"
            );
            System.out.println("✅ Migration DB: ENUM statut mis à jour avec succès.");

        } catch (Exception e) {
            // Si la colonne est déjà correcte, MySQL retourne une erreur silencieuse
            System.out.println("ℹ️ Migration DB statut: " + e.getMessage());
        }
    }
}
