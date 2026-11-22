package djerbatourb.djerbatourb.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "tables_resto")
public class TableResto {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String numero;

    @Column(nullable = false)
    private Integer capacite;

    @Column(columnDefinition = "BOOLEAN DEFAULT TRUE")
    private Boolean disponible = true;

    private BigDecimal prix;
    private Integer uniteHeures = 1; // 1 pour par heure, 2 pour par 2 heures, etc.
    private BigDecimal budgetMinimal = BigDecimal.ZERO;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "restaurant_id", nullable = false)
    private Restaurant restaurant;

    @Transient
    private Boolean reserved = false;

    public TableResto() {}

    public Boolean getReserved() {
        return reserved;
    }

    public void setReserved(Boolean reserved) {
        this.reserved = reserved;
    }

    public BigDecimal getPrix() {
        return prix;
    }

    public void setPrix(BigDecimal prix) {
        this.prix = prix;
    }

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

    public Integer getCapacite() {
        return capacite;
    }

    public void setCapacite(Integer capacite) {
        this.capacite = capacite;
    }

    public Boolean getDisponible() {
        return disponible;
    }

    public void setDisponible(Boolean disponible) {
        this.disponible = disponible;
    }

    public Integer getUniteHeures() { return uniteHeures; }
    public void setUniteHeures(Integer uniteHeures) { this.uniteHeures = uniteHeures; }

    public BigDecimal getBudgetMinimal() {
        return budgetMinimal;
    }

    public void setBudgetMinimal(BigDecimal budgetMinimal) {
        this.budgetMinimal = budgetMinimal;
    }

    public Restaurant getRestaurant() {
        return restaurant;
    }

    public void setRestaurant(Restaurant restaurant) {
        this.restaurant = restaurant;
    }
}
