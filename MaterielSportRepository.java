package djerbatourb.djerbatourb.repository;

import djerbatourb.djerbatourb.entity.MaterielSport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MaterielSportRepository extends JpaRepository<MaterielSport, Long> {
    List<MaterielSport> findBySportIdOrderByIdDesc(Long sportId);

    @Query("SELECT m FROM MaterielSport m WHERE m.sport.utilisateur.email = :email ORDER BY m.id DESC")
    List<MaterielSport> findBySportEmailOrderByIdDesc(@Param("email") String email);
}
