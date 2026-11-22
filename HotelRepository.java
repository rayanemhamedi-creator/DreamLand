package djerbatourb.djerbatourb.repository;

import djerbatourb.djerbatourb.entity.Hotel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface HotelRepository extends JpaRepository<Hotel, Long> {
    Optional<Hotel> findByUtilisateurEmail(String email);
    Optional<Hotel> findByUtilisateurId(Long id);
    List<Hotel> findAllByUtilisateurEstBloqueFalse();
    List<Hotel> findByPrixLessThanEqualAndValideTrue(java.math.BigDecimal maxPrice);
    List<Hotel> findByPrixBetweenAndValideTrue(java.math.BigDecimal minPrice, java.math.BigDecimal maxPrice);
    List<Hotel> findByPrixGreaterThanEqualAndValideTrue(java.math.BigDecimal minPrice);
}
