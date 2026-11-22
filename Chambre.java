package djerbatourb.djerbatourb.entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "chambres")
public class Chambre {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String numero;

    @Column(nullable = false, length = 50)
    private String type;

    @Column(nullable = false)
    private Integer capacite;

    @Column(nullable = false)
    private BigDecimal prix;

    @Column(nullable = false)
    private Integer nombreTotal = 1;

    // Mode "Avec voyageurs" : prix du premier adulte (occupant principal)
    // Mode "Prix libre"     : non utilisé pour le calcul
    @Column(name = "prix_par_adulte")
    private BigDecimal prixParAdulte; // prix d'un adulte supplémentaire (au-delà du 1er)

    @Column(name = "prix_par_enfant_3_10")
    private BigDecimal prixParEnfant3_10;

    @Column(name = "prix_par_enfant_11_17")
    private BigDecimal prixParEnfant11_17;

    // Mode "Prix libre" : tarif fixe de la chambre (sans gestion des occupants)
    @Column(name = "prix_libre")
    private BigDecimal prixLibre;

    @Column(name = "nb_lits_simples")
    private Integer nbLitsSimples = 0;

    @Column(name = "nb_lits_doubles")
    private Integer nbLitsDoubles = 0;

    @Column(columnDefinition = "BOOLEAN DEFAULT TRUE")
    private Boolean disponible = true;

    @Column(name = "date_debut_indisponibilite")
    private LocalDateTime dateDebutIndisponibilite;

    @Column(name = "date_fin_indisponibilite")
    private LocalDateTime dateFinIndisponibilite;

    @Column(columnDefinition = "TEXT")
    private String urlImage;

    @Column(columnDefinition = "TEXT")
    private String description;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hotel_id", nullable = false)
    private Hotel hotel;

    @Column(columnDefinition = "BOOLEAN DEFAULT TRUE")
    @JsonProperty("aWifi")
    private Boolean aWifi = true;

    @Column(columnDefinition = "BOOLEAN DEFAULT TRUE")
    @JsonProperty("aClimatisation")
    private Boolean aClimatisation = true;

    @Column(columnDefinition = "BOOLEAN DEFAULT FALSE")
    @JsonProperty("aSmartTv")
    private Boolean aSmartTv = false;

    @Column(columnDefinition = "BOOLEAN DEFAULT FALSE")
    @JsonProperty("aCoffreFort")
    private Boolean aCoffreFort = false;

    @Column(columnDefinition = "BOOLEAN DEFAULT FALSE")
    @JsonProperty("aBureau")
    private Boolean aBureau = false;

    @Column(columnDefinition = "BOOLEAN DEFAULT FALSE")
    @JsonProperty("aBalcon")
    private Boolean aBalcon = false;

    @Column(columnDefinition = "BOOLEAN DEFAULT FALSE")
    @JsonProperty("aVueSurMer")
    private Boolean aVueSurMer = false;

    public Chambre() {}

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNumero() {
        return numero;
    }

    public void setNumero(String numero) {
        this.numero = numero;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Integer getCapacite() {
        return capacite;
    }

    public void setCapacite(Integer capacite) {
        this.capacite = capacite;
    }

    public BigDecimal getPrix() {
        return prix;
    }

    public void setPrix(BigDecimal prix) {
        this.prix = prix;
    }

    public Integer getNombreTotal() {
        return nombreTotal;
    }

    public void setNombreTotal(Integer nombreTotal) {
        this.nombreTotal = nombreTotal;
    }

    public Boolean isDisponible() {
        return disponible;
    }

    public void setDisponible(Boolean disponible) {
        this.disponible = disponible;
    }

    public String getUrlImage() { return urlImage; }

    public void setUrlImage(String urlImage) {
        this.urlImage = urlImage;
    }

    public String getDescription() { return description; }

    public void setDescription(String description) { this.description = description; }

    public Hotel getHotel() {
        return hotel;
    }

    public void setHotel(Hotel hotel) {
        this.hotel = hotel;
    }

    public Boolean getAWifi() { return aWifi; }
    public void setAWifi(Boolean aWifi) { this.aWifi = aWifi; }

    public Boolean getAClimatisation() { return aClimatisation; }
    public void setAClimatisation(Boolean aClimatisation) { this.aClimatisation = aClimatisation; }

    public Boolean getASmartTv() { return aSmartTv; }
    public void setASmartTv(Boolean aSmartTv) { this.aSmartTv = aSmartTv; }

    public Boolean getACoffreFort() { return aCoffreFort; }
    public void setACoffreFort(Boolean aCoffreFort) { this.aCoffreFort = aCoffreFort; }

    public Boolean getABureau() { return aBureau; }
    public void setABureau(Boolean aBureau) { this.aBureau = aBureau; }

    public Boolean getABalcon() { return aBalcon; }
    public void setABalcon(Boolean aBalcon) { this.aBalcon = aBalcon; }

    public Boolean getAVueSurMer() { return aVueSurMer; }
    public void setAVueSurMer(Boolean aVueSurMer) { this.aVueSurMer = aVueSurMer; }

    public BigDecimal getPrixParAdulte() { return prixParAdulte; }
    public void setPrixParAdulte(BigDecimal prixParAdulte) { this.prixParAdulte = prixParAdulte; }

    public BigDecimal getPrixParEnfant3_10() { return prixParEnfant3_10; }
    public void setPrixParEnfant3_10(BigDecimal prixParEnfant3_10) { this.prixParEnfant3_10 = prixParEnfant3_10; }

    public BigDecimal getPrixParEnfant11_17() { return prixParEnfant11_17; }
    public void setPrixParEnfant11_17(BigDecimal prixParEnfant11_17) { this.prixParEnfant11_17 = prixParEnfant11_17; }

    public Integer getNbLitsSimples() { return nbLitsSimples; }
    public void setNbLitsSimples(Integer nbLitsSimples) { this.nbLitsSimples = nbLitsSimples; }

    public Integer getNbLitsDoubles() { return nbLitsDoubles; }
    public void setNbLitsDoubles(Integer nbLitsDoubles) { this.nbLitsDoubles = nbLitsDoubles; }

    public BigDecimal getPrixLibre() { return prixLibre; }
    public void setPrixLibre(BigDecimal prixLibre) { this.prixLibre = prixLibre; }

    public LocalDateTime getDateDebutIndisponibilite() { return dateDebutIndisponibilite; }
    public void setDateDebutIndisponibilite(LocalDateTime dateDebutIndisponibilite) { this.dateDebutIndisponibilite = dateDebutIndisponibilite; }

    public LocalDateTime getDateFinIndisponibilite() { return dateFinIndisponibilite; }
    public void setDateFinIndisponibilite(LocalDateTime dateFinIndisponibilite) { this.dateFinIndisponibilite = dateFinIndisponibilite; }
}
