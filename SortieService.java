package djerbatourb.djerbatourb.service;

import djerbatourb.djerbatourb.entity.Sortie;
import djerbatourb.djerbatourb.entity.Statut;
import djerbatourb.djerbatourb.repository.SortieRepository;
import djerbatourb.djerbatourb.repository.ReservationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SortieService {
    private final SortieRepository repository;
    private final ReservationRepository reservationRepository;
    private final GuideService guideService;
    private final PriceService priceService;
    private final NotificationService notificationService;

    public SortieService(SortieRepository repository, 
                         djerbatourb.djerbatourb.repository.ReservationRepository reservationRepository, 
                         GuideService guideService,
                         PriceService priceService,
                         NotificationService notificationService) {
        this.repository = repository;
        this.reservationRepository = reservationRepository;
        this.guideService = guideService;
        this.priceService = priceService;
        this.notificationService = notificationService;
    }

    public List<Sortie> findAll() { 
        List<Sortie> list = repository.findAllByGuideUtilisateurEstBloqueFalseOrderByIdDesc();
        for (Sortie s : list) {
            Integer booked = reservationRepository.sumReservedPlacesForSortie(s.getId(), s.getDateSortie());
            if (booked != null && booked > 0) {
                s.setPlacesDisponibles(Math.max(0, s.getPlacesDisponibles() - booked));
            }
        }
        return list; 
    }

    @Transactional
    public Sortie addSortieToUser(Sortie entity, String email) {
        if (entity.getDateSortie() != null && entity.getDateSortie().isBefore(java.time.LocalDateTime.now())) {
            throw new RuntimeException("Vous ne pouvez pas créer une sortie pour une date déjà passée.");
        }
        djerbatourb.djerbatourb.entity.Guide guide = guideService.findByEmail(email);
        entity.setGuide(guide);
        
        boolean isUpdate = (entity.getId() != null);
        Sortie saved = repository.save(entity);
        
        if (isUpdate) {
            notificationService.notifyUpdatedService("Sortie", saved.getTitre());
        } else {
            notificationService.notifyNewService("Nouvelle sortie avec le Guide " + guide.getUtilisateur().getNom(), saved.getTitre());
        }
        
        return saved;
    }

    public List<Sortie> findByGuideEmail(String email) {
        List<Sortie> list = repository.findByGuideUtilisateurEmail(email);
        for (Sortie s : list) {
            Integer booked = reservationRepository.sumReservedPlacesForSortie(s.getId(), s.getDateSortie());
            if (booked != null && booked > 0) {
                s.setPlacesDisponibles(Math.max(0, s.getPlacesDisponibles() - booked));
            }
        }
        return list;
    }

    public List<djerbatourb.djerbatourb.entity.Sortie> findFutureSorties(String email) {
        List<Sortie> list = repository.findByGuideUtilisateurEmail(email); 
        for (Sortie s : list) {
            Integer booked = reservationRepository.sumReservedPlacesForSortie(s.getId(), s.getDateSortie());
            if (booked != null && booked > 0) {
                s.setPlacesDisponibles(Math.max(0, s.getPlacesDisponibles() - booked));
            }
        }
        return list;
    }

    public java.util.Map<String, Object> getStats(String email) {
        List<Sortie> mySorties = findByGuideEmail(email);
        List<djerbatourb.djerbatourb.entity.Reservation> reservations = reservationRepository.findBySortieIn(mySorties).stream()
                .filter(r -> r.getTypeReservation() != djerbatourb.djerbatourb.entity.TypeReservation.EN_LIGNE 
                        || r.getStatutPaiement() == djerbatourb.djerbatourb.entity.StatutPaiement.PAYE)
                .collect(java.util.stream.Collectors.toList());

        java.math.BigDecimal totalCommission = reservations.stream()
                .map(r -> {
                    if (r.getStatut() == djerbatourb.djerbatourb.entity.Statut.ANNULEE) {
                        return r.getCommissionAdmin() != null ? r.getCommissionAdmin() : java.math.BigDecimal.ZERO;
                    }
                    return (r.getCommissionAdmin() != null) 
                            ? r.getCommissionAdmin() 
                            : priceService.multiply(r.getPrixTotal(), 0.1);
                })
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        
        java.math.BigDecimal totalRevenuNet = reservations.stream()
                .map(r -> {
                    if (r.getStatut() == djerbatourb.djerbatourb.entity.Statut.ANNULEE) {
                        return r.getGainPrestataire() != null ? r.getGainPrestataire() : java.math.BigDecimal.ZERO;
                    }
                    return (r.getGainPrestataire() != null) 
                            ? r.getGainPrestataire() 
                            : priceService.multiply(r.getPrixTotal(), 0.9);
                })
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        
        java.math.BigDecimal chiffreAffaires = totalCommission.add(totalRevenuNet);
        
        java.util.Map<String, Object> stats = new java.util.HashMap<>();
        stats.put("futureTours", mySorties.size());
        stats.put("totalReservations", reservations.stream().filter(r -> r.getStatut() == djerbatourb.djerbatourb.entity.Statut.CONFIRMEE).count());
        stats.put("chiffreAffaires", chiffreAffaires);
        stats.put("adminCommission", totalCommission);
        stats.put("revenuNet", totalRevenuNet);

        return stats;
    }

    public Sortie findById(Long id) { 
        if (id == null) return null;
        Sortie s = repository.findById(id).orElse(null);
        if (s != null) {
            Integer booked = reservationRepository.sumReservedPlacesForSortie(s.getId(), s.getDateSortie());
            if (booked != null && booked > 0) {
                s.setPlacesDisponibles(Math.max(0, s.getPlacesDisponibles() - booked));
            }
        }
        return s; 
    }
    public Sortie save(Sortie entity) { 
        if (entity == null) return null;
        return repository.save(entity); 
    }
    @Transactional
    public void deleteById(Long id) { 
        if (id == null) return;
        Sortie sortie = repository.findById(id).orElse(null);
        if (sortie != null) {
            List<Long> affectedUserIds = reservationRepository.findBySortieIdAndStatut(id, Statut.CONFIRMEE)
                    .stream()
                    .map(r -> r.getUtilisateur().getId())
                    .collect(Collectors.toList());
            
            notificationService.notifyDeletedService("Sortie", sortie.getTitre(), affectedUserIds);
            repository.deleteById(id); 
        }
    }
}
