package djerbatourb.djerbatourb.repository;

import djerbatourb.djerbatourb.entity.Utilisateur;
import djerbatourb.djerbatourb.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UtilisateurRepository extends JpaRepository<Utilisateur, Long> {
    Optional<Utilisateur> findByEmail(String email);
    Boolean existsByEmail(String email);  //Vérifier si un email existe
    long countByRole(Role role);  //Compter les utilisateurs par rôle
    List<Utilisateur> findAllByRole(Role role);
    List<Utilisateur> findAllByOrderByIdDesc();
}
