package djerbatourb.djerbatourb.service;

import djerbatourb.djerbatourb.dto.EvenementDTO;
import djerbatourb.djerbatourb.entity.Evenement;
import djerbatourb.djerbatourb.entity.Utilisateur;
import djerbatourb.djerbatourb.entity.Statut;
import djerbatourb.djerbatourb.repository.ReservationRepository;
import djerbatourb.djerbatourb.repository.EvenementRepository;
import djerbatourb.djerbatourb.repository.UtilisateurRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class EvenementService {
    private final EvenementRepository repository;
    private final UtilisateurRepository userRepository;
    private final ReservationRepository reservationRepository;
    private final NotificationService notificationService;

    public EvenementService(EvenementRepository repository, 
                            UtilisateurRepository userRepository,
                            ReservationRepository reservationRepository,
                            NotificationService notificationService) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.reservationRepository = reservationRepository;
        this.notificationService = notificationService;
    }

    public List<EvenementDTO> findAll() { 
        return repository.findAllByUtilisateurEstBloqueFalseOrderByIdDesc().stream().map(this::toDTO).toList(); 
    }
    
    public List<Evenement> findByMyEvents(String email) {
        return repository.findByUtilisateurEmailOrderByIdDesc(email);
    }
    
    private EvenementDTO toDTO(Evenement e) {
        String org = e.getNomOrganisateur();
        if (org == null || org.trim().isEmpty()) {
            org = "Inconnu";
            if(e.getUtilisateur() != null) {
                Utilisateur u = e.getUtilisateur();
                if (u.getNom() != null) {
                    org = u.getNom();
                    if (u.getPrenom() != null && !u.getPrenom().trim().isEmpty() && 
                        u.getRole() != null && (u.getRole().name().equals("GUIDE") || u.getRole().name().equals("TOURISTE"))) {
                        org = (u.getNom() + " " + u.getPrenom()).trim();
                    }
                }
                if (org == null || org.trim().isEmpty() || org.equals("Inconnu")) {
                    org = "Organisateur #" + u.getId();
                }
            }
        }
        return new EvenementDTO(
            e.getId(), e.getTitre(), e.getDescription(), e.getDateDebut(), e.getDateFin(),
            e.getLieu(), e.getPrix(), e.getPlacesDisponibles(), org, e.getUrlImage(), e.getLocalisation(),
            e.getUtilisateur()
        );
    }

    public Evenement save(Evenement entity) { 
        if (entity == null) return null;
        return repository.save(entity); 
    }

    @Transactional
    public Evenement addEventToUser(Evenement entity, String email) {
        if (entity.getDateDebut() != null && entity.getDateDebut().isBefore(java.time.LocalDateTime.now())) {
            throw new RuntimeException("Vous ne pouvez pas créer un événement pour une date déjà passée.");
        }
        Utilisateur user = userRepository.findByEmail(email).orElseThrow();
        entity.setUtilisateur(user);
        
        // Populate organizer name
        String orgName = user.getNom();
        if (user.getPrenom() != null && !user.getPrenom().trim().isEmpty() && 
            user.getRole() != null && (user.getRole().name().equals("GUIDE") || user.getRole().name().equals("TOURISTE"))) {
            orgName = (user.getNom() + " " + user.getPrenom()).trim();
        }
        if (orgName == null || orgName.trim().isEmpty()) {
            orgName = "Organisateur #" + user.getId();
        }
        entity.setNomOrganisateur(orgName);
        
        boolean isUpdate = (entity.getId() != null);
        Evenement saved = repository.save(entity);
        
        if (isUpdate) {
            notificationService.notifyUpdatedService("Événement", saved.getTitre());
        } else {
            notificationService.notifyNewService("Événement", saved.getTitre());
        }
        
        return saved;
    }

    public Evenement findById(Long id) { 
        if (id == null) return null;
        return repository.findById(id).orElse(null); 
    }
    @Transactional
    public void deleteById(Long id) { 
        if (id == null) return;
        Evenement ev = repository.findById(id).orElse(null);
        if (ev != null) {
            // Identifier les clients impactés
            List<Long> affectedUserIds = reservationRepository.findByEvenementIdAndStatut(id, Statut.CONFIRMEE)
                    .stream()
                    .map(r -> r.getUtilisateur().getId())
                    .collect(Collectors.toList());
            
            // Envoyer les notifications AVANT la suppression pour avoir les infos du service
            notificationService.notifyDeletedService("Événement", ev.getTitre(), affectedUserIds);
            
            repository.deleteById(id);
        }
    }
}
