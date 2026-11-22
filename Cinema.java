package djerbatourb.djerbatourb.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "cinemas")
public class Cinema {
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



    public Cinema() {}

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

    @Column(nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean valide = false;

    public Boolean getValide() { return valide; }
    public void setValide(Boolean valide) { this.valide = valide; }
}
