package djerbatourb.djerbatourb.repository;

import djerbatourb.djerbatourb.entity.Reservation;
import djerbatourb.djerbatourb.entity.Statut;
import djerbatourb.djerbatourb.entity.Sortie;
import djerbatourb.djerbatourb.entity.TypeReservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    
    Optional<Reservation> findByStripeSessionId(String stripeSessionId);

    // 🔹 Calculer le nombre total de personnes réservées pour une sortie spécifique à une date donnée
    // ✅ Exclut les réservations annulées
    @Query("SELECT COALESCE(SUM(r.nombrePersonnes), 0) FROM Reservation r WHERE r.sortie.id = :sortieId AND r.dateDebut = :date AND r.statut <> djerbatourb.djerbatourb.entity.Statut.ANNULEE")
    Integer sumReservedPlacesForSortie(@Param("sortieId") Long sortieId, @Param("date") LocalDateTime date);

    // 🔹 Récupérer toutes les réservations correspondant à une liste de sorties
    List<Reservation> findBySortieIn(List<Sortie> sorties);

    // 🔹 Récupérer toutes les réservations d'un hôtel donné, triées du plus récent au plus ancien
    @Query("SELECT r FROM Reservation r LEFT JOIN r.chambre c LEFT JOIN c.hotel h WHERE r.hotelId = :hotelId OR h.id = :hotelId ORDER BY r.id DESC")
    List<Reservation> findByHotelId(@Param("hotelId") Long hotelId);

    // 🔹 Réservations CONFIRMEE pour un hôtel (dates occupées – pour bloquer le calendrier)
    @Query("SELECT r FROM Reservation r WHERE r.hotelId = :hotelId " +
           "AND r.statut = djerbatourb.djerbatourb.entity.Statut.CONFIRMEE " +
           "AND r.dateDebut IS NOT NULL AND r.dateFin IS NOT NULL")
    List<Reservation> findConfirmedByHotelId(@Param("hotelId") Long hotelId);

    // 🔹 Toutes les réservations non-annulées d'un hôtel qui chevauchent une plage de dates.
    // Utilisé pour compter les chambres déjà allouées par type via listeProduitsChoisis.
    @Query("SELECT r FROM Reservation r WHERE r.hotelId = :hotelId " +
           "AND r.statut <> djerbatourb.djerbatourb.entity.Statut.ANNULEE " +
           "AND r.dateDebut < :dateFin AND r.dateFin > :dateDebut")
    List<Reservation> findOverlappingByHotelId(@Param("hotelId") Long hotelId,
                                               @Param("dateDebut") LocalDateTime dateDebut,
                                               @Param("dateFin") LocalDateTime dateFin);

    // 🔹 Variante excluant une réservation spécifique (pour la re-vérification avant paiement)
    @Query("SELECT r FROM Reservation r WHERE r.hotelId = :hotelId " +
           "AND r.id <> :excludeId " +
           "AND r.statut <> djerbatourb.djerbatourb.entity.Statut.ANNULEE " +
           "AND r.dateDebut < :dateFin AND r.dateFin > :dateDebut")
    List<Reservation> findOverlappingByHotelIdExcluding(@Param("hotelId") Long hotelId,
                                                         @Param("dateDebut") LocalDateTime dateDebut,
                                                         @Param("dateFin") LocalDateTime dateFin,
                                                         @Param("excludeId") Long excludeId);

    // 🔹 Calculer le revenu total de toutes les réservations confirmées ou passées
    @Query("SELECT COALESCE(SUM(r.prixTotal), 0) FROM Reservation r WHERE r.statut IN :statuts")
    Double sumAllRevenues(@Param("statuts") List<Statut> statuts);

    // 🔹 Récupérer toutes les réservations d'un restaurant spécifique, triées par id décroissant
    // LEFT JOIN on both to handle A_EMPORTER (restaurant direct) and SUR_PLACE (via tableResto)
    @Query("SELECT DISTINCT r FROM Reservation r LEFT JOIN r.restaurant rest LEFT JOIN r.tableResto t LEFT JOIN t.restaurant tr WHERE rest.id = :restaurantId OR tr.id = :restaurantId ORDER BY r.id DESC")
    List<Reservation> findByRestaurantId(@Param("restaurantId") Long restaurantId);


    // 🔹 Récupérer toutes les réservations d'un cinéma spécifique, triées par id décroissant
    @Query("SELECT r FROM Reservation r WHERE r.film.cinema.id = :cinemaId ORDER BY r.id DESC")
    List<Reservation> findByCinemaId(@Param("cinemaId") Long cinemaId);

    // 🔹 Récupérer les réservations liées aux événements d'un utilisateur spécifique
    @Query("SELECT r FROM Reservation r JOIN FETCH r.evenement e JOIN FETCH r.utilisateur u WHERE e.utilisateur.email = :email ORDER BY r.id DESC")
    List<Reservation> findByEvenementUtilisateurEmail(@Param("email") String email);

    List<Reservation> findAllByOrderByIdDesc();

    @Query("SELECT COALESCE(SUM(r.nombreMateriel), 0) FROM Reservation r WHERE r.sport.id = :sportId AND r.dateDebut = :dateSession AND r.statut <> djerbatourb.djerbatourb.entity.Statut.ANNULEE")
    Integer sumReservedMaterial(@Param("sportId") Long sportId, @Param("dateSession") LocalDateTime dateSession);

    @Query("SELECT COALESCE(SUM(r.nombreMateriel), 0) FROM Reservation r WHERE r.materielSport.id = :materielId AND r.statut <> djerbatourb.djerbatourb.entity.Statut.ANNULEE " +
           "AND ((r.dateDebut < :dateFin AND r.dateFin > :dateDebut))")
    Integer sumReservedSpecificMaterialOverlapping(@Param("materielId") Long materielId, @Param("dateDebut") LocalDateTime dateDebut, @Param("dateFin") LocalDateTime dateFin);

    @Query("SELECT COALESCE(SUM(r.nombreMateriel), 0) FROM Reservation r WHERE r.materielSport.id = :materielId AND r.dateDebut = :dateSession AND r.statut <> djerbatourb.djerbatourb.entity.Statut.ANNULEE")
    Integer sumReservedSpecificMaterial(@Param("materielId") Long materielId, @Param("dateSession") LocalDateTime dateSession);

    @Query("SELECT r FROM Reservation r WHERE r.sport.utilisateur.email = :email ORDER BY r.id DESC")
    List<Reservation> findBySportEmailOrderByIdDesc(@Param("email") String email);


    @Query("SELECT COUNT(r) FROM Reservation r WHERE r.tableResto.id = :tableId AND r.statut <> djerbatourb.djerbatourb.entity.Statut.ANNULEE " +
           "AND ((r.dateDebut < :dateFin AND r.dateFin > :dateDebut))")
    Long countReservedTable(@Param("tableId") Long tableId, @Param("dateDebut") LocalDateTime dateDebut, @Param("dateFin") LocalDateTime dateFin);

    @Query("SELECT COALESCE(SUM(r.nombreChambres), 0) FROM Reservation r WHERE r.chambre.id = :chambreId AND r.statut <> djerbatourb.djerbatourb.entity.Statut.ANNULEE AND r.dateDebut < :dateFin AND r.dateFin > :dateDebut")
    Integer sumReservedRooms(@Param("chambreId") Long chambreId, @Param("dateDebut") LocalDateTime dateDebut, @Param("dateFin") LocalDateTime dateFin);

    // Compte le nombre total de chambres d'un type donné déjà réservées dans un hôtel
    // sur une plage de dates qui se chevauchent (toutes réservations non annulées).
    // Utilisé pour la vérification réelle de disponibilité par type de chambre.
    @Query("SELECT COALESCE(SUM(r.nombreChambres), 0) FROM Reservation r " +
           "WHERE r.hotelId = :hotelId " +
           "AND r.chambre.type = :typeChambre " +
           "AND r.statut <> djerbatourb.djerbatourb.entity.Statut.ANNULEE " +
           "AND r.dateDebut < :dateFin AND r.dateFin > :dateDebut")
    Integer sumReservedRoomsByType(@Param("hotelId") Long hotelId,
                                   @Param("typeChambre") String typeChambre,
                                   @Param("dateDebut") LocalDateTime dateDebut,
                                   @Param("dateFin") LocalDateTime dateFin);

    // Variante excluant une réservation spécifique (pour la vérification avant paiement)
    @Query("SELECT COALESCE(SUM(r.nombreChambres), 0) FROM Reservation r " +
           "WHERE r.hotelId = :hotelId " +
           "AND r.chambre.type = :typeChambre " +
           "AND r.id <> :excludeId " +
           "AND r.statut <> djerbatourb.djerbatourb.entity.Statut.ANNULEE " +
           "AND r.dateDebut < :dateFin AND r.dateFin > :dateDebut")
    Integer sumReservedRoomsByTypeExcluding(@Param("hotelId") Long hotelId,
                                            @Param("typeChambre") String typeChambre,
                                            @Param("dateDebut") LocalDateTime dateDebut,
                                            @Param("dateFin") LocalDateTime dateFin,
                                            @Param("excludeId") Long excludeId);

    @Query("SELECT r FROM Reservation r WHERE r.sport.id = :sportId ORDER BY r.id DESC")
    List<Reservation> findBySportId(@Param("sportId") Long sportId);

    @Query("SELECT r FROM Reservation r WHERE r.utilisateur.email = :email ORDER BY r.id DESC")
    List<Reservation> findByUtilisateurEmailOrderByIdDesc(@Param("email") String email);

    // 🔹 Récupérer toutes les réservations d'un prestataire selon le type de réservation
    @Query("SELECT r FROM Reservation r WHERE r.typeReservation = :type ORDER BY r.id DESC")
    List<Reservation> findByTypeReservation(@Param("type") TypeReservation type);

    @Query("SELECT r FROM Reservation r WHERE r.utilisateur.email = :email AND r.typeReservation = :type ORDER BY r.id DESC")
    List<Reservation> findByUtilisateurEmailAndTypeReservation(@Param("email") String email, @Param("type") TypeReservation type);

    // 🔹 Find active reservations for specific service types to notify users on deletion
    List<Reservation> findByEvenementIdAndStatut(Long evenementId, Statut statut);
    List<Reservation> findByFilmIdAndStatut(Long filmId, Statut statut);
    List<Reservation> findByChambreIdAndStatut(Long chambreId, Statut statut);
    List<Reservation> findByTableRestoIdAndStatut(Long tableRestoId, Statut statut);
    List<Reservation> findByMaterielSportIdAndStatut(Long materielId, Statut statut);
    List<Reservation> findBySortieIdAndStatut(Long sortieId, Statut statut);

    // 🔹 Variantes "Excluding" : utilisées par checkAvailabilityBeforePayment pour exclure
    // la réservation courante (EN_ATTENTE) des vérifications de disponibilité.

    @Query("SELECT COUNT(r) FROM Reservation r WHERE r.tableResto.id = :tableId AND r.id <> :excludeId " +
           "AND r.statut <> djerbatourb.djerbatourb.entity.Statut.ANNULEE " +
           "AND ((r.dateDebut < :dateFin AND r.dateFin > :dateDebut))")
    Long countReservedTableExcluding(@Param("tableId") Long tableId,
                                     @Param("dateDebut") LocalDateTime dateDebut,
                                     @Param("dateFin") LocalDateTime dateFin,
                                     @Param("excludeId") Long excludeId);

    @Query("SELECT COALESCE(SUM(r.nombreMateriel), 0) FROM Reservation r WHERE r.materielSport.id = :materielId " +
           "AND r.id <> :excludeId " +
           "AND r.statut <> djerbatourb.djerbatourb.entity.Statut.ANNULEE " +
           "AND ((r.dateDebut < :dateFin AND r.dateFin > :dateDebut))")
    Integer sumReservedSpecificMaterialOverlappingExcluding(@Param("materielId") Long materielId,
                                                             @Param("dateDebut") LocalDateTime dateDebut,
                                                             @Param("dateFin") LocalDateTime dateFin,
                                                             @Param("excludeId") Long excludeId);

    @Query("SELECT COALESCE(SUM(r.nombrePersonnes), 0) FROM Reservation r WHERE r.sortie.id = :sortieId " +
           "AND r.id <> :excludeId " +
           "AND r.dateDebut = :date " +
           "AND r.statut <> djerbatourb.djerbatourb.entity.Statut.ANNULEE")
    Integer sumReservedPlacesForSortieExcluding(@Param("sortieId") Long sortieId,
                                                 @Param("date") LocalDateTime date,
                                                 @Param("excludeId") Long excludeId);
}
