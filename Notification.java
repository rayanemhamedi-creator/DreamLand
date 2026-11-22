package djerbatourb.djerbatourb.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, name = "utilisateur_id")
    private Long utilisateurId; // Le touriste recevant la notification

    @Column(nullable = false, length = 500)
    private String message;

    @Column(nullable = false, name = "est_lu")
    private boolean estLu = false;

    @Column(nullable = false, name = "date_creation")
    private LocalDateTime dateCreation = LocalDateTime.now();

    public Notification(Long utilisateurId, String message) {
        this.utilisateurId = utilisateurId;
        this.message = message;
        this.estLu = false;
        this.dateCreation = LocalDateTime.now();
    }
}
