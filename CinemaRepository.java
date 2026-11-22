package djerbatourb.djerbatourb.repository;

import djerbatourb.djerbatourb.entity.Cinema;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface CinemaRepository extends JpaRepository<Cinema, Long> {
    Optional<Cinema> findByUtilisateurEmail(String email);
    Optional<Cinema> findByUtilisateurId(Long id);
    List<Cinema> findAllByUtilisateurEstBloqueFalse();
}
