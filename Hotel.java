package djerbatourb.djerbatourb.entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;

@Entity
@Table(name = "hotels")
public class Hotel {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "utilisateur_id")
    private Utilisateur utilisateur;

    private String adresse;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "localisation", length = 255)
    private String localisation;


    // ─── Formules / Types de pension (prix supplémentaire par nuit) ────────────
    // RO = Room Only (sans repas)
    @Column(name = "prix_ro")
    private BigDecimal prixRO;

    // BB = Bed & Breakfast (petit-déjeuner)
    @Column(name = "prix_bb")
    private BigDecimal prixBB;

    // HB = Half Board (petit-déj + dîner)
    @Column(name = "prix_hb")
    private BigDecimal prixHB;

    // FB = Full Board (3 repas)
    @Column(name = "prix_fb")
    private BigDecimal prixFB;

    // Soft All Inclusive (3 repas + boissons non alcoolisées)
    @Column(name = "prix_soft_ai")
    private BigDecimal prixSoftAI;

    @Column(name = "prix_all_inclusive")
    private BigDecimal prixAllInclusive;

    @Column(name = "prix")
    private BigDecimal prix;


    // ─── Image fields ──────────────────────────────────────────────────────────
    @Column(columnDefinition = "TEXT")
    private String urlImage;

    @Column(columnDefinition = "BOOLEAN DEFAULT FALSE")
    @JsonProperty("aReception24h")
    private Boolean aReception24h = false;

    @Column(columnDefinition = "BOOLEAN DEFAULT FALSE")
    @JsonProperty("aSecurite24h")
    private Boolean aSecurite24h = false;

    @Column(columnDefinition = "BOOLEAN DEFAULT FALSE")
    @JsonProperty("aWifiGenerale")
    private Boolean aWifiGenerale = false;

    @Column(columnDefinition = "BOOLEAN DEFAULT FALSE")
    @JsonProperty("aParking")
    private Boolean aParking = false;

    @Column(columnDefinition = "BOOLEAN DEFAULT FALSE")
    @JsonProperty("aAscenseur")
    private Boolean aAscenseur = false;

    @Column(columnDefinition = "BOOLEAN DEFAULT FALSE")
    @JsonProperty("aPiscine")
    private Boolean aPiscine = false;

    @Column(columnDefinition = "BOOLEAN DEFAULT FALSE")
    @JsonProperty("aServiceReception")
    private Boolean aServiceReception = false;

    public Hotel() {
    }

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

    // ─── Getters / Setters ────────────────────────────────────────────────────

    public BigDecimal getPrixRO() { return prixRO; }
    public void setPrixRO(BigDecimal prixRO) { this.prixRO = prixRO; }

    public BigDecimal getPrixBB() { return prixBB; }
    public void setPrixBB(BigDecimal prixBB) { this.prixBB = prixBB; }

    public BigDecimal getPrixHB() { return prixHB; }
    public void setPrixHB(BigDecimal prixHB) { this.prixHB = prixHB; }

    public BigDecimal getPrixFB() { return prixFB; }
    public void setPrixFB(BigDecimal prixFB) { this.prixFB = prixFB; }

    public BigDecimal getPrixSoftAI() { return prixSoftAI; }
    public void setPrixSoftAI(BigDecimal prixSoftAI) { this.prixSoftAI = prixSoftAI; }

    public BigDecimal getPrixAllInclusive() { return prixAllInclusive; }
    public void setPrixAllInclusive(BigDecimal prixAllInclusive) { this.prixAllInclusive = prixAllInclusive; }

    public BigDecimal getPrix() { return prix; }
    public void setPrix(BigDecimal prix) { this.prix = prix; }

    @Column(nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean valide = false;

    public Boolean getValide() { return valide; }
    public void setValide(Boolean valide) { this.valide = valide; }

    // Proxy methods for Utilisateur fields
    public void setNom(String nom) {
        if (this.utilisateur != null) {
            this.utilisateur.setNom(nom);
        }
    }

    public Boolean getIsBlocked() {
        return this.utilisateur != null && Boolean.TRUE.equals(this.utilisateur.getEstBloque());
    }

    public Boolean getAReception24h() { return aReception24h; }
    public void setAReception24h(Boolean aReception24h) { this.aReception24h = aReception24h; }

    public Boolean getASecurite24h() { return aSecurite24h; }
    public void setASecurite24h(Boolean aSecurite24h) { this.aSecurite24h = aSecurite24h; }

    public Boolean getAWifiGenerale() { return aWifiGenerale; }
    public void setAWifiGenerale(Boolean aWifiGenerale) { this.aWifiGenerale = aWifiGenerale; }

    public Boolean getAParking() { return aParking; }
    public void setAParking(Boolean aParking) { this.aParking = aParking; }

    public Boolean getAAscenseur() { return aAscenseur; }
    public void setAAscenseur(Boolean aAscenseur) { this.aAscenseur = aAscenseur; }

    public Boolean getAPiscine() { return aPiscine; }
    public void setAPiscine(Boolean aPiscine) { this.aPiscine = aPiscine; }

    public Boolean getAServiceReception() { return aServiceReception; }
    public void setAServiceReception(Boolean aServiceReception) { this.aServiceReception = aServiceReception; }

    public String getLocalisation() { return localisation; }
    public void setLocalisation(String localisation) { this.localisation = localisation; }
}
