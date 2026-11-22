package djerbatourb.djerbatourb.service;

import djerbatourb.djerbatourb.entity.Restaurant;
import djerbatourb.djerbatourb.entity.Statut;
import djerbatourb.djerbatourb.repository.RestaurantRepository;
import djerbatourb.djerbatourb.repository.TableRestoRepository;
import djerbatourb.djerbatourb.repository.ReservationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class RestaurantService {
    private final RestaurantRepository repository;
    private final TableRestoRepository tableRepository;
    private final ReservationRepository reservationRepository;
    private final djerbatourb.djerbatourb.repository.UtilisateurRepository utilisateurRepository;
    private final PriceService priceService;
    private final NotificationService notificationService;
    
    public RestaurantService(RestaurantRepository repository,
                             TableRestoRepository tableRepository,
                             ReservationRepository reservationRepository,
                             djerbatourb.djerbatourb.repository.UtilisateurRepository utilisateurRepository,
                             PriceService priceService,
                             NotificationService notificationService) {
        this.repository = repository;
        this.tableRepository = tableRepository;
        this.reservationRepository = reservationRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.priceService = priceService;
        this.notificationService = notificationService;
    }

    public List<Restaurant> findAll() { return repository.findAllByUtilisateurEstBloqueFalse(); }
    public Restaurant findById(Long id) { 
        if (id == null) return null;
        return repository.findById(id).orElse(null); 
    }

    /**
     * Cherche le restaurant de l'utilisateur.
     */
    public Restaurant findByEmail(String email) {
        return repository.findByUtilisateurEmail(email)
                .orElseThrow(() -> new RuntimeException("Restaurant non trouvé pour : " + email));
    }

    @Transactional
    public Restaurant save(Restaurant entity, String email) {
        // 1. Chercher le restaurant existant par l'email de son utilisateur
        Restaurant existing = repository.findByUtilisateurEmail(email).orElse(null);
        if (existing == null && entity.getId() != null) {
            existing = repository.findById(entity.getId()).orElse(null);
        }
        if (existing == null) {
            existing = entity;
        }

        // 2. Mise à jour de l'Utilisateur lié
        if (existing.getUtilisateur() != null && entity.getUtilisateur() != null) {
            djerbatourb.djerbatourb.entity.Utilisateur u = existing.getUtilisateur();
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

        // 3. Mise à jour des champs Restaurant
        if (entity.getAdresse() != null) existing.setAdresse(entity.getAdresse());
        if (entity.getDescription() != null) existing.setDescription(entity.getDescription());
        if (entity.getLocalisation() != null) existing.setLocalisation(entity.getLocalisation());
        if (entity.getHeureOuverture() != null) existing.setHeureOuverture(entity.getHeureOuverture());
        if (entity.getHeureFermeture() != null) existing.setHeureFermeture(entity.getHeureFermeture());
        if (entity.getJoursOuverture() != null) existing.setJoursOuverture(entity.getJoursOuverture());
        if (entity.getType() != null) existing.setType(entity.getType());
        if (entity.getUrlImage() != null) existing.setUrlImage(entity.getUrlImage());

        boolean isNew = (existing.getId() == null);
        Restaurant saved = repository.saveAndFlush(existing);

        String typeStr = (saved.getType() != null && saved.getType() == djerbatourb.djerbatourb.entity.TypeRestaurant.CAFE) ? "Café" : "Restaurant";
        if (isNew) {
            notificationService.notifyNewService(typeStr, saved.getUtilisateur().getNom());
        } else {
            notificationService.notifyUpdatedService(typeStr, saved.getUtilisateur().getNom());
        }

        return saved;
    }

    @Transactional
    public Restaurant update(Restaurant entity) {
        if (entity == null) return null;
        Restaurant saved = repository.save(entity);
        String typeStr = (saved.getType() != null && saved.getType() == djerbatourb.djerbatourb.entity.TypeRestaurant.CAFE) ? "Café" : "Restaurant";
        notificationService.notifyUpdatedService(typeStr, saved.getUtilisateur().getNom());
        return saved;
    }

    public List<djerbatourb.djerbatourb.entity.TableResto> findAvailableTables(Long restId, java.time.LocalDateTime dateHeure) {
        java.time.LocalDateTime dateFin = dateHeure.plusHours(2);
        java.util.List<djerbatourb.djerbatourb.entity.TableResto> tables = tableRepository.findByRestaurantId(restId);
        for (djerbatourb.djerbatourb.entity.TableResto table : tables) {
            if (Boolean.TRUE.equals(table.getDisponible())) {
                Long count = reservationRepository.countReservedTable(table.getId(), dateHeure, dateFin);
                table.setReserved(count > 0);
            }
        }
        return tables.stream()
                .filter(t -> Boolean.TRUE.equals(t.getDisponible()))
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteById(Long id) { 
        if (id == null) return;
        Restaurant rest = repository.findById(id).orElse(null);
        if (rest != null) {
            List<Long> affectedUserIds = reservationRepository.findByRestaurantId(id)
                    .stream()
                    .filter(r -> r.getStatut() == Statut.CONFIRMEE)
                    .map(r -> r.getUtilisateur().getId())
                    .collect(Collectors.toList());
            
            String typeStr = (rest.getType() != null && rest.getType() == djerbatourb.djerbatourb.entity.TypeRestaurant.CAFE) ? "Café" : "Restaurant";
            notificationService.notifyDeletedService(typeStr, rest.getUtilisateur().getNom(), affectedUserIds);
            repository.deleteById(id); 
        }
    }

    public java.util.Map<String, Object> getStats(String email) {
        Restaurant rest = findByEmail(email);
        if (rest == null) return java.util.Map.of("totalTables", 0, "reservedTables", 0,
                "chiffreAffaires", java.math.BigDecimal.ZERO, "adminCommission", java.math.BigDecimal.ZERO, "revenuNet", java.math.BigDecimal.ZERO);

        java.util.List<djerbatourb.djerbatourb.entity.TableResto> tables = tableRepository.findByRestaurantId(rest.getId());
        java.util.List<djerbatourb.djerbatourb.entity.Reservation> res = reservationRepository.findByRestaurantId(rest.getId()).stream()
                .filter(r -> r.getTypeReservation() != djerbatourb.djerbatourb.entity.TypeReservation.EN_LIGNE 
                        || r.getStatutPaiement() == djerbatourb.djerbatourb.entity.StatutPaiement.PAYE)
                .collect(java.util.stream.Collectors.toList());

        java.util.Map<String, Object> stats = new java.util.HashMap<>();
        stats.put("totalTables", tables.size());

        long occupied = res.stream()
                .filter(r -> r.getStatut() == djerbatourb.djerbatourb.entity.Statut.CONFIRMEE)
                .count();
        stats.put("reservedTables", occupied);

        java.math.BigDecimal totalCommission = res.stream()
                .filter(r -> r.getStatut() != djerbatourb.djerbatourb.entity.Statut.EN_ATTENTE)
                .map(r -> {
                    if (r.getStatut() == djerbatourb.djerbatourb.entity.Statut.ANNULEE) {
                        return r.getCommissionAdmin() != null ? r.getCommissionAdmin() : java.math.BigDecimal.ZERO;
                    }
                    return (r.getCommissionAdmin() != null)
                            ? r.getCommissionAdmin()
                            : priceService.multiply(r.getPrixTotal(), 0.1);
                })
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

        java.math.BigDecimal totalRevenuNet = res.stream()
                .filter(r -> r.getStatut() != djerbatourb.djerbatourb.entity.Statut.EN_ATTENTE)
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
}
