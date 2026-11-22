package djerbatourb.djerbatourb.repository;

import djerbatourb.djerbatourb.entity.Restaurant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RestaurantRepository extends JpaRepository<Restaurant, Long> {
    Optional<Restaurant> findByUtilisateurEmail(String email);
    Optional<Restaurant> findByUtilisateurId(Long id);
    List<Restaurant> findAllByUtilisateurEstBloqueFalse();
    List<Restaurant> findByTypeAndValideTrue(djerbatourb.djerbatourb.entity.TypeRestaurant type);
    long countByType(djerbatourb.djerbatourb.entity.TypeRestaurant type);
}
