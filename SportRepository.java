package djerbatourb.djerbatourb.repository;

import djerbatourb.djerbatourb.entity.Sport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SportRepository extends JpaRepository<Sport, Long> {
    Optional<Sport> findByUtilisateurEmail(String email);
    Optional<Sport> findByUtilisateurId(Long id);
    List<Sport> findAllByUtilisateurEstBloqueFalse();
}
