package djerbatourb.djerbatourb.repository;

import djerbatourb.djerbatourb.entity.Sortie;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SortieRepository extends JpaRepository<Sortie, Long> {
    List<Sortie> findByGuideUtilisateurEmail(String email);
    List<Sortie> findAllByOrderByIdDesc();
    List<Sortie> findAllByGuideUtilisateurEstBloqueFalseOrderByIdDesc();
    List<Sortie> findByTitreContainingIgnoreCaseOrDescriptionContainingIgnoreCase(String keyword1, String keyword2);
}
