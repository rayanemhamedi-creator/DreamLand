package djerbatourb.djerbatourb.repository;

import djerbatourb.djerbatourb.entity.Chambre;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ChambreRepository extends JpaRepository<Chambre, Long> {
    
    // Filtrage pour le dashboard prestataire
    List<Chambre> findByHotelUtilisateurEmailOrderByIdDesc(String email);

    List<Chambre> findByHotelIdOrderByIdDesc(Long hotelId);

    List<Chambre> findAllByOrderByIdDesc();

    // Recherche de chambres disponibles (individuelles) pour un type et une config de lits donnés
    @Query("SELECT c FROM Chambre c WHERE c.hotel.id = :hotelId AND c.type = :type AND c.disponible = true " +
           "AND (:nbLitsSimples IS NULL OR c.nbLitsSimples >= :nbLitsSimples) " +
           "AND (:nbLitsDoubles IS NULL OR c.nbLitsDoubles >= :nbLitsDoubles) " +
           "AND NOT EXISTS (SELECT r FROM Reservation r WHERE r.chambre.id = c.id " +
           "AND r.statut <> djerbatourb.djerbatourb.entity.Statut.ANNULEE " +
           "AND r.dateDebut < :dateFin AND r.dateFin > :dateDebut) " +
           "AND (c.dateDebutIndisponibilite IS NULL OR c.dateFinIndisponibilite IS NULL " +
           "OR c.dateDebutIndisponibilite >= :dateFin OR c.dateFinIndisponibilite <= :dateDebut)")
    List<Chambre> findAvailableChambres(@Param("hotelId") Long hotelId, 
                                        @Param("type") String type, 
                                        @Param("dateDebut") LocalDateTime dateDebut, 
                                        @Param("dateFin") LocalDateTime dateFin,
                                        @Param("nbLitsSimples") Integer nbLitsSimples,
                                        @Param("nbLitsDoubles") Integer nbLitsDoubles);

    // Variante utilisée par checkAvailabilityBeforePayment : exclut la réservation courante
    // pour ne pas bloquer la chambre sur laquelle le paiement est en cours.
    @Query("SELECT c FROM Chambre c WHERE c.hotel.id = :hotelId AND c.type = :type AND c.disponible = true " +
           "AND (:nbLitsSimples IS NULL OR c.nbLitsSimples >= :nbLitsSimples) " +
           "AND (:nbLitsDoubles IS NULL OR c.nbLitsDoubles >= :nbLitsDoubles) " +
           "AND NOT EXISTS (SELECT r FROM Reservation r WHERE r.chambre.id = c.id " +
           "AND r.id <> :excludeReservationId " +
           "AND r.statut <> djerbatourb.djerbatourb.entity.Statut.ANNULEE " +
           "AND r.dateDebut < :dateFin AND r.dateFin > :dateDebut) " +
           "AND (c.dateDebutIndisponibilite IS NULL OR c.dateFinIndisponibilite IS NULL " +
           "OR c.dateDebutIndisponibilite >= :dateFin OR c.dateFinIndisponibilite <= :dateDebut)")
    List<Chambre> findAvailableChambresExcluding(@Param("hotelId") Long hotelId,
                                                  @Param("type") String type,
                                                  @Param("dateDebut") LocalDateTime dateDebut,
                                                  @Param("dateFin") LocalDateTime dateFin,
                                                  @Param("nbLitsSimples") Integer nbLitsSimples,
                                                  @Param("nbLitsDoubles") Integer nbLitsDoubles,
                                                  @Param("excludeReservationId") Long excludeReservationId);
}
//@Query permet d'écrire ma propre requête (JPQL ou SQL)
//@Param sert à lier un paramètre Java avec la requête