package djerbatourb.djerbatourb.service;

import djerbatourb.djerbatourb.entity.Sport;
import djerbatourb.djerbatourb.entity.Utilisateur;
import djerbatourb.djerbatourb.entity.Statut;
import djerbatourb.djerbatourb.repository.SportRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SportService {
    private final SportRepository repository;
    private final djerbatourb.djerbatourb.repository.ReservationRepository reservationRepository;
    private final djerbatourb.djerbatourb.repository.MaterielSportRepository materielSportRepository;
    private final djerbatourb.djerbatourb.repository.UtilisateurRepository utilisateurRepository;
    private final PriceService priceService;
    private final NotificationService notificationService;

    public SportService(SportRepository repository, 
                        djerbatourb.djerbatourb.repository.ReservationRepository reservationRepository, 
                        djerbatourb.djerbatourb.repository.MaterielSportRepository materielSportRepository,
                        djerbatourb.djerbatourb.repository.UtilisateurRepository utilisateurRepository,
                        PriceService priceService,
                        NotificationService notificationService) {
        this.repository = repository;
        this.reservationRepository = reservationRepository;
        this.materielSportRepository = materielSportRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.priceService = priceService;
        this.notificationService = notificationService;
    }

    public List<Sport> findAll() { return repository.findAllByUtilisateurEstBloqueFalse(); }

    public List<Sport> findByMySports(String email) {
        return repository.findByUtilisateurEmail(email).map(List::of).orElse(List.of());
    }

    public Sport findByEmail(String email) {
        return repository.findByUtilisateurEmail(email).orElseThrow(() -> new RuntimeException("Espace Sport non trouvé pour : " + email));
    }

    @Transactional
    public Sport addSportToUser(Sport entity, String email) {
        // 1. Chercher le sport existant par l'email de son utilisateur
        Sport existing = repository.findByUtilisateurEmail(email).orElse(null);
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
            u.setTelephone(entity.getUtilisateur().getTelephone());
            
            // Email update
            String newEmail = entity.getUtilisateur().getEmail();
            if (newEmail != null && !newEmail.equalsIgnoreCase(u.getEmail())) {
                if (utilisateurRepository.existsByEmail(newEmail)) {
                    throw new RuntimeException("Cet email est déjà utilisé par un autre compte.");
                }
                u.setEmail(newEmail);
            }

            // Image sync
            if (entity.getUrlImage() != null) {
                u.setUrlImage(entity.getUrlImage());
            }
            
            utilisateurRepository.saveAndFlush(u);
        }

        // 3. Mise à jour des champs Sport
        if (entity.getNomActivite() != null) existing.setNomActivite(entity.getNomActivite());
        if (entity.getLieu() != null) existing.setLieu(entity.getLieu());
        if (entity.getAdresse() != null) existing.setAdresse(entity.getAdresse());
        if (entity.getDescription() != null) existing.setDescription(entity.getDescription());
        if (entity.getLocalisation() != null) existing.setLocalisation(entity.getLocalisation());
        if (entity.getPrix() != null) existing.setPrix(entity.getPrix());
        if (entity.getNombreMaterielMax() != null) existing.setNombreMaterielMax(entity.getNombreMaterielMax());
        if (entity.getHeureOuverture() != null) existing.setHeureOuverture(entity.getHeureOuverture());
        if (entity.getHeureFermeture() != null) existing.setHeureFermeture(entity.getHeureFermeture());
        if (entity.getJoursOuverture() != null) existing.setJoursOuverture(entity.getJoursOuverture());
        if (entity.getUrlImage() != null) existing.setUrlImage(entity.getUrlImage());
        
        boolean isNew = (existing.getId() == null);
        Sport saved = repository.saveAndFlush(existing);
        
        if (isNew) {
            notificationService.notifyNewService("Espace Sport", saved.getNomActivite() != null ? saved.getNomActivite() : saved.getUtilisateur().getNom());
        } else {
            notificationService.notifyUpdatedService("Espace Sport", saved.getNomActivite() != null ? saved.getNomActivite() : saved.getUtilisateur().getNom());
        }
        
        return saved;
    }

    @Transactional
    public Sport update(Sport entity) {
        if (entity == null) return null;
        Sport saved = repository.save(entity);
        notificationService.notifyUpdatedService("Espace Sport", saved.getNomActivite() != null ? saved.getNomActivite() : saved.getUtilisateur().getNom());
        return saved;
    }

    public Sport findById(Long id) { 
        if (id == null) return null;
        return repository.findById(id).orElse(null); 
    }
    @Transactional
    public void deleteById(Long id) { 
        if (id == null) return;
        Sport sport = repository.findById(id).orElse(null);
        if (sport != null) {
            List<Long> affectedUserIds = reservationRepository.findBySportId(id)
                    .stream()
                    .filter(r -> r.getStatut() == Statut.CONFIRMEE)
                    .map(r -> r.getUtilisateur().getId())
                    .collect(Collectors.toList());
            
            notificationService.notifyDeletedService("Espace Sport", sport.getNomActivite() != null ? sport.getNomActivite() : sport.getUtilisateur().getNom(), affectedUserIds);
            repository.deleteById(id); 
        }
    }

    public java.util.Map<String, Object> getStats(String email) {
        Sport sport = findByEmail(email);
        java.util.List<djerbatourb.djerbatourb.entity.Reservation> reservations = reservationRepository.findBySportId(sport.getId()).stream()
                .filter(r -> r.getTypeReservation() != djerbatourb.djerbatourb.entity.TypeReservation.EN_LIGNE 
                        || r.getStatutPaiement() == djerbatourb.djerbatourb.entity.StatutPaiement.PAYE)
                .collect(java.util.stream.Collectors.toList());

        java.util.Map<String, Object> stats = new java.util.HashMap<>();
        
        Integer computedTotal = materielSportRepository.findBySportIdOrderByIdDesc(sport.getId()).stream()
                .mapToInt(m -> m.getQuantite() != null ? m.getQuantite() : 0).sum();
        
        stats.put("totalMaterial", computedTotal);
        
        // Matériel actuellement réservé
        Integer reservedNow = reservationRepository.sumReservedMaterial(sport.getId(), java.time.LocalDateTime.now());
        stats.put("reservedMaterial", reservedNow != null ? reservedNow : 0);
        
        // Dossiers de réservations confirmés
        stats.put("totalReservations", reservations.stream()
                .filter(r -> r.getStatut() == djerbatourb.djerbatourb.entity.Statut.CONFIRMEE)
                .count());
        
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
        
        stats.put("chiffreAffaires", chiffreAffaires);
        stats.put("adminCommission", totalCommission);
        stats.put("revenuNet", totalRevenuNet);

        return stats;
    }

    public int getAvailableQuantity(Long matId, java.time.LocalDateTime start, int durationMinutes) {
        djerbatourb.djerbatourb.entity.MaterielSport mat = materielSportRepository.findById(matId)
                .orElseThrow(() -> new RuntimeException("Équipement introuvable"));
        java.time.LocalDateTime end = start.plusMinutes(durationMinutes);
        Integer used = reservationRepository.sumReservedSpecificMaterialOverlapping(matId, start, end);
        if (used == null) used = 0;
        int total = mat.getQuantite() != null ? mat.getQuantite() : 0;
        return Math.max(0, total - used);
    }
}
