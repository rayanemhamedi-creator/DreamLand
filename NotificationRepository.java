package djerbatourb.djerbatourb.repository;

import djerbatourb.djerbatourb.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUtilisateurIdOrderByDateCreationDesc(Long utilisateurId);
    long countByUtilisateurIdAndEstLuFalse(Long utilisateurId);
}
