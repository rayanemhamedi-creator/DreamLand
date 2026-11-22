package djerbatourb.djerbatourb.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "sports")
public class Sport {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "utilisateur_id")
    private Utilisateur utilisateur;

    private String adresse;

    @Column(name = "localisation")
    private String localisation;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String nomActivite;
    private String lieu;
    private Double prix;
    private Boolean disponible;
    private Integer nombreMaterielMax;
    private String horairesTravail;
    private String heureOuverture;
    private String heureFermeture;
    private String joursOuverture;
    // ─── Image fields ──────────────────────────────────────────────────────────
    @Column(columnDefinition = "TEXT")
    private String urlImage;

    public Sport() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Utilisateur getUtilisateur() { return utilisateur; }
    public void setUtilisateur(Utilisateur utilisateur) { this.utilisateur = utilisateur; }

    public String getAdresse() { return adresse; }
    public void setAdresse(String adresse) { this.adresse = adresse; }

    public String getLocalisation() { return localisation; }
    public void setLocalisation(String localisation) { this.localisation = localisation; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getUrlImage() { return urlImage; }
    public void setUrlImage(String urlImage) { this.urlImage = urlImage; }

    public String getNomActivite() {
        return nomActivite;
    }

    public void setNomActivite(String nomActivite) {
        this.nomActivite = nomActivite;
    }

    public String getLieu() {
        return lieu;
    }

    public void setLieu(String lieu) {
        this.lieu = lieu;
    }

    public Double getPrix() {
        return prix;
    }

    public void setPrix(Double prix) {
        this.prix = prix;
    }

    public Boolean isDisponible() {
        return disponible;
    }

    public void setDisponible(Boolean disponible) {
        this.disponible = disponible;
    }

    public Integer getNombreMaterielMax() {
        return nombreMaterielMax;
    }

    public void setNombreMaterielMax(Integer nombreMaterielMax) {
        this.nombreMaterielMax = nombreMaterielMax;
    }

    public String getHorairesTravail() { return horairesTravail; }
    public void setHorairesTravail(String horairesTravail) { this.horairesTravail = horairesTravail; }

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
