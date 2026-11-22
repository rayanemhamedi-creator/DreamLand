package djerbatourb.djerbatourb.repository;

import djerbatourb.djerbatourb.entity.Avis;
import djerbatourb.djerbatourb.entity.TypeService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AvisRepository extends JpaRepository<Avis, Long> {
    List<Avis> findByTypeServiceAndIdService(TypeService typeService, Long idService);
    Optional<Avis> findByIdUtilisateurAndIdServiceAndTypeService(Long idUtilisateur, Long idService, TypeService typeService);
    boolean existsByIdUtilisateurAndIdServiceAndTypeService(Long idUtilisateur, Long idService, TypeService typeService);
}
