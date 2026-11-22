package djerbatourb.djerbatourb.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "guides")
public class Guide {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "utilisateur_id")
    private Utilisateur utilisateur;

    private String adresse;

    @Column(columnDefinition = "TEXT")
    private String description;
    // ─── Image fields ──────────────────────────────────────────────────────────
    @Column(columnDefinition = "TEXT")
    private String urlImage;
    
    private String localisation;

    
    private String heureOuverture;
    private String heureFermeture;
    private String joursOuverture; // "1,2,3,4,5,6,7"


    public Guide() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Utilisateur getUtilisateur() { return utilisateur; }
    public void setUtilisateur(Utilisateur utilisateur) { this.utilisateur = utilisateur; }

    public String getAdresse() { return adresse; }
    public void setAdresse(String adresse) { this.adresse = adresse; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getUrlImage() { return urlImage; }
    public void setUrlImage(String urlImage) { this.urlImage = urlImage; }

    public String getLocalisation() { return localisation; }
    public void setLocalisation(String localisation) { this.localisation = localisation; }

    public String getHeureOuverture() { return heureOuverture; }
    public void setHeureOuverture(String heureOuverture) { this.heureOuverture = heureOuverture; }

    public String getHeureFermeture() { return heureFermeture; }
    public void setHeureFermeture(String heureFermeture) { this.heureFermeture = heureFermeture; }

    public String getJoursOuverture() { return joursOuverture; }
    public void setJoursOuverture(String joursOuverture) { this.joursOuverture = joursOuverture; }

    @Column(nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean valide = false;

    public Boolean getValide() { return valide; }
    public void setValide(Boolean valide) { this.valide = valide; }
}
