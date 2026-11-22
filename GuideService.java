package djerbatourb.djerbatourb.service;

import djerbatourb.djerbatourb.entity.Guide;
import djerbatourb.djerbatourb.entity.Utilisateur;
import djerbatourb.djerbatourb.entity.Statut;
import djerbatourb.djerbatourb.repository.GuideRepository;
import djerbatourb.djerbatourb.repository.ReservationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class GuideService {
    private final GuideRepository repository;
    private final ReservationRepository reservationRepository;
    private final djerbatourb.djerbatourb.repository.UtilisateurRepository utilisateurRepository;
    private final NotificationService notificationService;

    public GuideService(GuideRepository repository, 
                        ReservationRepository reservationRepository,
                        djerbatourb.djerbatourb.repository.UtilisateurRepository utilisateurRepository,
                        NotificationService notificationService) {
        this.repository = repository;
        this.reservationRepository = reservationRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.notificationService = notificationService;
    }

    public List<Guide> findAll() { return repository.findAllByUtilisateurEstBloqueFalse(); }
    public Guide findById(Long id) { 
        if (id == null) return null;
        return repository.findById(id).orElse(null); 
    }

    /**
     * Cherche le guide par email de l'utilisateur.
     */
    public Guide findByEmail(String email) {
        return repository.findByUtilisateurEmail(email)
                .orElseThrow(() -> new RuntimeException("Profil Guide non trouvé pour : " + email));
    }

    @Transactional
    public Guide save(Guide entity, String email) {
        // 1. Chercher le guide existant par l'email de son utilisateur
        Guide existing = repository.findByUtilisateurEmail(email).orElse(null);
        if (existing == null && entity.getId() != null) {
            existing = repository.findById(entity.getId()).orElse(null);
        }
        if (existing == null) {
            existing = entity;
        }

        // 2. Mise à jour de l'Utilisateur lié
        if (existing.getUtilisateur() != null && entity.getUtilisateur() != null) {
            Utilisateur u = existing.getUtilisateur();
            u.setNom(entity.getUtilisateur().getNom());
            u.setPrenom(entity.getUtilisateur().getPrenom());
            u.setTelephone(entity.getUtilisateur().getTelephone());
            
            // Email update
            String newEmail = entity.getUtilisateur().getEmail();
            if (newEmail != null && !newEmail.equalsIgnoreCase(u.getEmail())) {
                if (utilisateurRepository.existsByEmail(newEmail)) {
                    throw new RuntimeException("Cet email est déjà utilisé par un autre compte.");
                }
                u.setEmail(newEmail);
            }

            // Image sync (Avatar)
            if (entity.getUrlImage() != null) {
                u.setUrlImage(entity.getUrlImage());
            }
            
            utilisateurRepository.saveAndFlush(u);
        }

        // 3. Mise à jour des champs Guide
        if (entity.getAdresse() != null) existing.setAdresse(entity.getAdresse());
        if (entity.getDescription() != null) existing.setDescription(entity.getDescription());
        if (entity.getLocalisation() != null) existing.setLocalisation(entity.getLocalisation());
        if (entity.getUrlImage() != null) existing.setUrlImage(entity.getUrlImage());
        if (entity.getHeureOuverture() != null) existing.setHeureOuverture(entity.getHeureOuverture());
        if (entity.getHeureFermeture() != null) existing.setHeureFermeture(entity.getHeureFermeture());
        if (entity.getJoursOuverture() != null) existing.setJoursOuverture(entity.getJoursOuverture());

        boolean isNew = (existing.getId() == null);
        Guide saved = repository.saveAndFlush(existing);
        
        String fullName = saved.getUtilisateur().getNom() + " " + saved.getUtilisateur().getPrenom();
        if (isNew) {
            notificationService.notifyNewService("Guide", fullName);
        } else {
            notificationService.notifyUpdatedService("Guide", fullName);
        }
        
        return saved;
    }

    @Transactional
    public Guide update(Guide entity) {
        if (entity == null) return null;
        Guide saved = repository.save(entity);
        String fullName = saved.getUtilisateur().getNom() + " " + saved.getUtilisateur().getPrenom();
        notificationService.notifyUpdatedService("Guide", fullName);
        return saved;
    }

    @Transactional
    public void deleteById(Long id) { 
        if (id == null) return;
        Guide guide = repository.findById(id).orElse(null);
        if (guide != null) {
            // Identifier les clients impactés par toutes les sorties de ce guide
            List<Long> affectedUserIds = reservationRepository.findAll().stream()
                    .filter(r -> r.getSortie() != null && r.getSortie().getGuide() != null && r.getSortie().getGuide().getId().equals(id))
                    .filter(r -> r.getStatut() == Statut.CONFIRMEE)
                    .map(r -> r.getUtilisateur().getId())
                    .collect(Collectors.toList());
            
            String fullName = guide.getUtilisateur().getNom() + " " + guide.getUtilisateur().getPrenom();
            notificationService.notifyDeletedService("Guide", fullName, affectedUserIds);
            repository.deleteById(id); 
        }
    }
}
