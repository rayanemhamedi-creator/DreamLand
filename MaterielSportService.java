package djerbatourb.djerbatourb.service;

import djerbatourb.djerbatourb.entity.MaterielSport;
import djerbatourb.djerbatourb.entity.Sport;
import djerbatourb.djerbatourb.entity.Statut;
import djerbatourb.djerbatourb.repository.MaterielSportRepository;
import djerbatourb.djerbatourb.repository.ReservationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class MaterielSportService {
    private final MaterielSportRepository repository;
    private final SportService sportService;
    private final ReservationRepository reservationRepository;
    private final NotificationService notificationService;

    public MaterielSportService(MaterielSportRepository repository, 
                                SportService sportService, 
                                ReservationRepository reservationRepository,
                                NotificationService notificationService) {
        this.repository = repository;
        this.sportService = sportService;
        this.reservationRepository = reservationRepository;
        this.notificationService = notificationService;
    }

    public List<MaterielSport> findBySportEmail(String email) {
        return repository.findBySportEmailOrderByIdDesc(email);
    }

    @Transactional
    public MaterielSport save(MaterielSport entity, String email) {
        if (entity == null) return null;
        Sport sport = sportService.findByEmail(email);
        entity.setSport(sport);
        
        boolean isUpdate = (entity.getId() != null);
        MaterielSport saved = repository.save(entity);
        
        if (isUpdate) {
            notificationService.notifyUpdatedService("Équipement Sportif", saved.getNom());
        } else {
            notificationService.notifyNewService("Équipement Sportif chez " + sport.getNomActivite(), saved.getNom());
        }
        
        return saved;
    }

    @Transactional
    public void deleteById(Long id) { 
        if (id == null) return;
        MaterielSport mat = repository.findById(id).orElse(null);
        if (mat != null) {
            List<Long> affectedUserIds = reservationRepository.findByMaterielSportIdAndStatut(id, Statut.CONFIRMEE)
                    .stream()
                    .map(r -> r.getUtilisateur().getId())
                    .collect(Collectors.toList());
            
            notificationService.notifyDeletedService("Équipement Sportif", mat.getNom(), affectedUserIds);
            repository.deleteById(id); 
        }
    }
}
