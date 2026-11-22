package djerbatourb.djerbatourb.repository;

import djerbatourb.djerbatourb.entity.TableResto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TableRestoRepository extends JpaRepository<TableResto, Long> {

    @Query("SELECT t FROM TableResto t WHERE t.restaurant.id = :restId AND t.disponible = true AND t.id NOT IN (" +
           "SELECT r.tableResto.id FROM Reservation r WHERE r.tableResto.restaurant.id = :restId " +
           "AND r.statut != djerbatourb.djerbatourb.entity.Statut.ANNULEE " +
           "AND ((r.dateDebut < :dateFin AND r.dateFin > :dateDebut)))")
    List<TableResto> findAvailableTables(@Param("restId") Long restId, 
                                         @Param("dateDebut") LocalDateTime dateDebut, 
                                         @Param("dateFin") LocalDateTime dateFin);
    List<TableResto> findByRestaurantId(Long restaurantId);
}
