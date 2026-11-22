package djerbatourb.djerbatourb.repository;

import djerbatourb.djerbatourb.entity.Touriste;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface TouristeRepository extends JpaRepository<Touriste, Long> {
    Optional<Touriste> findByUtilisateurId(Long utilisateurId);
}
