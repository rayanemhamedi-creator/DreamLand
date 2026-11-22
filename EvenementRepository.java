package djerbatourb.djerbatourb.repository;

import djerbatourb.djerbatourb.entity.Evenement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EvenementRepository extends JpaRepository<Evenement, Long> {
    List<Evenement> findByUtilisateurEmailOrderByIdDesc(String email);
    List<Evenement> findAllByOrderByIdDesc();
    List<Evenement> findAllByUtilisateurEstBloqueFalseOrderByIdDesc();
}
