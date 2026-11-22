package djerbatourb.djerbatourb.repository;

import djerbatourb.djerbatourb.entity.Guide;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface GuideRepository extends JpaRepository<Guide, Long> {
    Optional<Guide> findByUtilisateurEmail(String email);
    Optional<Guide> findByUtilisateurId(Long id);
    List<Guide> findAllByUtilisateurEstBloqueFalse();
}
