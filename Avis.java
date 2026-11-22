package djerbatourb.djerbatourb.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "avis", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"idUtilisateur", "idService", "typeService"})
})
public class Avis {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long idUtilisateur;

    @Column(nullable = false)
    private Long idService;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TypeService typeService;

    @Column(nullable = false)
    private Integer score; // 25, 50, 75, 100

    private LocalDateTime dateCreation;

    @PrePersist
    protected void onCreate() {
        dateCreation = LocalDateTime.now();
    }
}
