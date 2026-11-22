package djerbatourb.djerbatourb.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "materiels_sport")
public class MaterielSport {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nom;

    @Column(nullable = false)
    private BigDecimal prixParHeure;

    @Column(columnDefinition = "BOOLEAN DEFAULT TRUE")
    private Boolean disponible = true;

    @Column(nullable = false, columnDefinition = "INT DEFAULT 1")
    private Integer quantite = 1;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sport_id", nullable = false)
    private Sport sport;

    private String urlImage;

    public MaterielSport() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }
    public BigDecimal getPrixParHeure() { return prixParHeure; }
    public void setPrixParHeure(BigDecimal prixParHeure) { this.prixParHeure = prixParHeure; }
    public Boolean getDisponible() { return disponible; }
    public void setDisponible(Boolean disponible) { this.disponible = disponible; }
    public Integer getQuantite() { return quantite; }
    public void setQuantite(Integer quantite) { this.quantite = quantite; }
    
    public String getUrlImage() { return urlImage; }
    public void setUrlImage(String urlImage) { this.urlImage = urlImage; }

    public Sport getSport() { return sport; }
    public void setSport(Sport sport) { this.sport = sport; }
}
