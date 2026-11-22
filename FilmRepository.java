package djerbatourb.djerbatourb.repository;

import djerbatourb.djerbatourb.entity.Film;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface FilmRepository extends JpaRepository<Film, Long> {
    List<Film> findByCinemaIdOrderByIdDesc(Long cinemaId);
    List<Film> findByCinemaUtilisateurEmailOrderByIdDesc(String email);
    List<Film> findAllByOrderByIdDesc();
    List<Film> findAllByCinemaUtilisateurEstBloqueFalseOrderByIdDesc();
}
