package djerbatourb.djerbatourb.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "messages")
public class Message {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "expediteur_id", nullable = false)
    private Utilisateur expediteur;

    @ManyToOne
    @JoinColumn(name = "destinataire_id", nullable = false)
    private Utilisateur destinataire;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String contenu;

    private LocalDateTime dateEnvoi = LocalDateTime.now();

    private boolean estLu = false;

    // Type: "MESSAGE" (Tourist <-> Provider) or "CONTACT" (User <-> Admin)
    private String type;

    public Message() {}

    public Message(Utilisateur expediteur, Utilisateur destinataire, String contenu, String type) {
        this.expediteur = expediteur;
        this.destinataire = destinataire;
        this.contenu = contenu;
        this.type = type;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Utilisateur getExpediteur() { return expediteur; }
    public void setExpediteur(Utilisateur expediteur) { this.expediteur = expediteur; }
    public Utilisateur getDestinataire() { return destinataire; }
    public void setDestinataire(Utilisateur destinataire) { this.destinataire = destinataire; }
    public String getContenu() { return contenu; }
    public void setContenu(String contenu) { this.contenu = contenu; }
    public LocalDateTime getDateEnvoi() { return dateEnvoi; }
    public void setDateEnvoi(LocalDateTime dateEnvoi) { this.dateEnvoi = dateEnvoi; }
    public boolean getEstLu() { return estLu; }
    public void setEstLu(boolean lu) { estLu = lu; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
}
