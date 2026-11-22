package djerbatourb.djerbatourb.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "reservations")
public class Reservation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDateTime dateCreation = LocalDateTime.now();

    @Enumerated(EnumType.STRING)
    @Column(name = "type_reservation", columnDefinition = "VARCHAR(10) DEFAULT 'EN_LIGNE'")
    private TypeReservation typeReservation = TypeReservation.EN_LIGNE;

    private String serviceReserve; // Ex: chambre, table, activité, etc.


    @Enumerated(EnumType.STRING)
    private Statut statut = Statut.CONFIRMEE;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut_paiement")
    private StatutPaiement statutPaiement = StatutPaiement.EN_ATTENTE;

    private String stripeSessionId;

    private LocalDateTime dateDebut;
    private LocalDateTime dateFin;
    private Integer nombrePersonnes = 1;
    private Integer nombreChambres = 1;
    private BigDecimal prixTotal;
    private Long hotelId;
    private Integer nbLitsSimples;
    private Integer nbLitsDoubles;
    @Column(name = "restaurant_id", insertable = false, updatable = false)
    private Long restaurantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "restaurant_id")
    private Restaurant restaurant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "utilisateur_id", nullable = false)
    @JsonIgnore
    private Utilisateur utilisateur;

    private String clientNom;
    private String clientPrenom;
    private String clientTelephone;
    private String clientEmail;
    private String clientAdresse;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chambre_id")
    private Chambre chambre; // Gardé pour compatibilité (chambre principale)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "table_resto_id")
    private TableResto tableResto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "film_id")
    private Film film;



    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sortie_id")
    private Sortie sortie;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evenement_id")
    private Evenement evenement;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sport_id")
    private Sport sport;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "materiel_sport_id")
    private MaterielSport materielSport;

    private Integer nombreMateriel;
    private Integer nombreHeures;

    private Integer nombreAdultes;
    private Integer nombreEnfants;

    private String typeLogement;

    // Mode de réservation global : "AVEC_VOYAGEURS", "PRIX_LIBRE", ou "MIXTE"
    // Le détail par chambre est stocké dans listeProduitsChoisis (JSON)
    @Column(name = "mode_reservation", length = 20)
    private String modeReservation;



    private BigDecimal montantRembourse = BigDecimal.ZERO;
    private BigDecimal commissionAdmin = BigDecimal.ZERO;
    private BigDecimal gainPrestataire = BigDecimal.ZERO;

    @Column(columnDefinition = "TEXT")
    private String listeProduitsChoisis;

    @Column(columnDefinition = "TEXT")
    private String listeCompagnons;

    private BigDecimal totalMenu = BigDecimal.ZERO;
    private BigDecimal totalGlobal = BigDecimal.ZERO;
    private String modeConsommation = "SUR_PLACE"; // SUR_PLACE ou A_EMPORTER

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "menu_id")
    private Menu menu;

    private Integer quantite;

    @Column(name = "prix_unitaire")
    private BigDecimal prixUnitaire;

    @Transient
    private List<MenuProductDTO> menuProducts;

    public static class SimpleMenu {
        private Long id;
        private String nom;
        private String description;
        private BigDecimal prix;
        private String image;

        public SimpleMenu() {}

        public SimpleMenu(Menu m) {
            if (m != null) {
                this.id = m.getId();
                this.nom = m.getNom();
                this.description = m.getDescription();
                this.prix = m.getPrix();
                this.image = m.getImage();
            }
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getNom() { return nom; }
        public void setNom(String nom) { this.nom = nom; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public BigDecimal getPrix() { return prix; }
        public void setPrix(BigDecimal prix) { this.prix = prix; }

        public String getImage() { return image; }
        public void setImage(String image) { this.image = image; }
    }

    public static class MenuProductDTO {
        private SimpleMenu menu;
        private Integer quantite;
        private BigDecimal prixUnitaire;

        public MenuProductDTO() {}

        public MenuProductDTO(Menu menu, Integer quantite, BigDecimal prixUnitaire) {
            this.menu = menu != null ? new SimpleMenu(menu) : null;
            this.quantite = quantite;
            this.prixUnitaire = prixUnitaire;
        }

        public MenuProductDTO(SimpleMenu menu, Integer quantite, BigDecimal prixUnitaire) {
            this.menu = menu;
            this.quantite = quantite;
            this.prixUnitaire = prixUnitaire;
        }

        public SimpleMenu getMenu() { return menu; }
        public void setMenu(SimpleMenu menu) { this.menu = menu; }

        public Integer getQuantite() { return quantite; }
        public void setQuantite(Integer quantite) { this.quantite = quantite; }

        public BigDecimal getPrixUnitaire() { return prixUnitaire; }
        public void setPrixUnitaire(BigDecimal prixUnitaire) { this.prixUnitaire = prixUnitaire; }
    }

    public Reservation() {}
    
    public String getTypeLogement() { return typeLogement; }
    public void setTypeLogement(String typeLogement) { this.typeLogement = typeLogement; }



    public Long getId() {
        return id;
    }

    public TypeReservation getTypeReservation() {
        return typeReservation;
    }

    public void setTypeReservation(TypeReservation typeReservation) {
        this.typeReservation = typeReservation;
    }

    public String getServiceReserve() {
        return serviceReserve;
    }

    public void setServiceReserve(String serviceReserve) {
        this.serviceReserve = serviceReserve;
    }


    public void setId(Long id) {
        this.id = id;
    }

    public LocalDateTime getDateCreation() {
        return dateCreation;
    }

    public void setDateCreation(LocalDateTime dateCreation) {
        this.dateCreation = dateCreation;
    }

    public Statut getStatut() {
        return statut;
    }

    public void setStatut(Statut statut) {
        this.statut = statut;
    }

    public BigDecimal getPrixTotal() { return prixTotal; }
    public void setPrixTotal(BigDecimal prixTotal) { this.prixTotal = prixTotal; }

    public BigDecimal getMontantRembourse() { return montantRembourse; }
    public void setMontantRembourse(BigDecimal montantRembourse) { this.montantRembourse = montantRembourse; }

    public BigDecimal getCommissionAdmin() { return commissionAdmin; }
    public void setCommissionAdmin(BigDecimal commissionAdmin) { this.commissionAdmin = commissionAdmin; }

    public BigDecimal getGainPrestataire() { return gainPrestataire; }
    public void setGainPrestataire(BigDecimal gainPrestataire) { this.gainPrestataire = gainPrestataire; }

    public LocalDateTime getDateDebut() {
        return dateDebut;
    }

    public void setDateDebut(LocalDateTime dateDebut) {
        this.dateDebut = dateDebut;
    }

    public LocalDateTime getDateSession() {
        return dateDebut;
    }

    public void setDateSession(LocalDateTime dateSession) {
        this.dateDebut = dateSession;
    }

    public LocalDateTime getDateFin() {
        return dateFin;
    }

    public void setDateFin(LocalDateTime dateFin) {
        this.dateFin = dateFin;
    }

    public Integer getNombreChambres() {
        return nombreChambres;
    }

    public void setNombreChambres(Integer nombreChambres) {
        this.nombreChambres = nombreChambres;
    }

    public Integer getNombrePersonnes() {
        return nombrePersonnes;
    }

    public void setNombrePersonnes(Integer nombrePersonnes) {
        this.nombrePersonnes = nombrePersonnes;
    }

    public Utilisateur getUtilisateur() {
        return utilisateur;
    }

    public void setUtilisateur(Utilisateur utilisateur) {
        this.utilisateur = utilisateur;
    }

    public String getClientNom() { return clientNom; }
    public void setClientNom(String clientNom) { this.clientNom = clientNom; }

    public String getClientPrenom() { return clientPrenom; }
    public void setClientPrenom(String clientPrenom) { this.clientPrenom = clientPrenom; }

    public String getClientTelephone() { return clientTelephone; }
    public void setClientTelephone(String clientTelephone) { this.clientTelephone = clientTelephone; }

    public String getClientEmail() { return clientEmail; }
    public void setClientEmail(String clientEmail) { this.clientEmail = clientEmail; }

    public Integer getNombreAdultes() { return nombreAdultes; }
    public void setNombreAdultes(Integer nombreAdultes) { this.nombreAdultes = nombreAdultes; }

    public Integer getNombreEnfants() { return nombreEnfants; }
    public void setNombreEnfants(Integer nombreEnfants) { this.nombreEnfants = nombreEnfants; }

    public String getClientAdresse() { return clientAdresse; }
    public void setClientAdresse(String clientAdresse) { this.clientAdresse = clientAdresse; }



    public Chambre getChambre() {
        return chambre;
    }

    public void setChambre(Chambre chambre) {
        this.chambre = chambre;
    }

    public TableResto getTableResto() {
        return tableResto;
    }

    public void setTableResto(TableResto tableResto) {
        this.tableResto = tableResto;
    }

    public Film getFilm() {
        return film;
    }

    public void setFilm(Film film) {
        this.film = film;
    }



    public Sortie getSortie() {
        return sortie;
    }

    public void setSortie(Sortie sortie) {
        this.sortie = sortie;
    }

    public Evenement getEvenement() {
        return evenement;
    }

    public void setEvenement(Evenement evenement) {
        this.evenement = evenement;
    }

    public Sport getSport() {
        return sport;
    }

    public void setSport(Sport sport) {
        this.sport = sport;
    }

    public MaterielSport getMaterielSport() {
        return materielSport;
    }

    public void setMaterielSport(MaterielSport materielSport) {
        this.materielSport = materielSport;
    }

    public Integer getNombreMateriel() {
        return nombreMateriel;
    }

    public void setNombreMateriel(Integer nombreMateriel) {
        this.nombreMateriel = nombreMateriel;
    }

    public Integer getNombreHeures() {
        return nombreHeures;
    }

    public void setNombreHeures(Integer nombreHeures) {
        this.nombreHeures = nombreHeures;
    }


    public Long getHotelId() { return hotelId; }
    public void setHotelId(Long hotelId) { this.hotelId = hotelId; }

    public StatutPaiement getStatutPaiement() { return statutPaiement; }
    public void setStatutPaiement(StatutPaiement statutPaiement) { this.statutPaiement = statutPaiement; }

    public String getStripeSessionId() { return stripeSessionId; }
    public void setStripeSessionId(String stripeSessionId) { this.stripeSessionId = stripeSessionId; }

    public String getListeProduitsChoisis() { return listeProduitsChoisis; }
    public void setListeProduitsChoisis(String listeProduitsChoisis) { this.listeProduitsChoisis = listeProduitsChoisis; }

    public BigDecimal getTotalMenu() { return totalMenu; }
    public void setTotalMenu(BigDecimal totalMenu) { this.totalMenu = totalMenu; }

    public BigDecimal getTotalGlobal() { return totalGlobal; }
    public void setTotalGlobal(BigDecimal totalGlobal) { this.totalGlobal = totalGlobal; }

    public List<MenuProductDTO> getMenuProducts() {
        if (this.listeProduitsChoisis != null && !this.listeProduitsChoisis.isEmpty() && (this.restaurantId != null || this.restaurant != null || (this.serviceReserve != null && this.serviceReserve.toLowerCase().contains("restaurant")))) {
            try {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                mapper.configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
                return mapper.readValue(this.listeProduitsChoisis, new com.fasterxml.jackson.core.type.TypeReference<List<MenuProductDTO>>() {});
            } catch (Exception e) {
                return new ArrayList<>();
            }
        }
        return new ArrayList<>();
    }

    public void setMenuProducts(List<MenuProductDTO> menuProducts) {
        this.menuProducts = menuProducts;
    }

    public Menu getMenu() { return menu; }
    public void setMenu(Menu menu) { this.menu = menu; }

    public Integer getQuantite() { return quantite; }
    public void setQuantite(Integer quantite) { this.quantite = quantite; }

    public BigDecimal getPrixUnitaire() { return prixUnitaire; }
    public void setPrixUnitaire(BigDecimal prixUnitaire) { this.prixUnitaire = prixUnitaire; }



    public Integer getNbLitsSimples() { return nbLitsSimples; }
    public void setNbLitsSimples(Integer nbLitsSimples) { this.nbLitsSimples = nbLitsSimples; }

    public Integer getNbLitsDoubles() { return nbLitsDoubles; }
    public void setNbLitsDoubles(Integer nbLitsDoubles) { this.nbLitsDoubles = nbLitsDoubles; }

    public String getModeConsommation() { return modeConsommation; }
    public void setModeConsommation(String modeConsommation) { this.modeConsommation = modeConsommation; }

    public Long getRestaurantId() { return restaurantId; }
    public void setRestaurantId(Long restaurantId) { this.restaurantId = restaurantId; }

    public Restaurant getRestaurant() { return restaurant; }
    public void setRestaurant(Restaurant restaurant) { this.restaurant = restaurant; }

    public String getListeCompagnons() { return listeCompagnons; }
    public void setListeCompagnons(String listeCompagnons) { this.listeCompagnons = listeCompagnons; }

    public String getModeReservation() { return modeReservation; }
    public void setModeReservation(String modeReservation) { this.modeReservation = modeReservation; }
}
