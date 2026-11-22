package djerbatourb.djerbatourb.service;

import djerbatourb.djerbatourb.entity.Cinema;
import djerbatourb.djerbatourb.entity.Utilisateur;
import djerbatourb.djerbatourb.repository.CinemaRepository;
import djerbatourb.djerbatourb.repository.FilmRepository;
import djerbatourb.djerbatourb.repository.ReservationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class CinemaService {
    private final CinemaRepository repository;
    private final FilmRepository filmRepository;
    private final ReservationRepository reservationRepository;
    private final djerbatourb.djerbatourb.repository.UtilisateurRepository utilisateurRepository;
    private final PriceService priceService;
    private final NotificationService notificationService;

    public CinemaService(CinemaRepository repository,
                         FilmRepository filmRepository,
                         ReservationRepository reservationRepository,
                         djerbatourb.djerbatourb.repository.UtilisateurRepository utilisateurRepository,
                         PriceService priceService,
                         NotificationService notificationService) {
        this.repository = repository;
        this.filmRepository = filmRepository;
        this.reservationRepository = reservationRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.priceService = priceService;
        this.notificationService = notificationService;
    }

    public List<Cinema> findAll() { return repository.findAllByUtilisateurEstBloqueFalse(); }
    public Cinema findById(Long id) { 
        if (id == null) return null;
        return repository.findById(id).orElse(null); 
    }

    public List<djerbatourb.djerbatourb.entity.Film> searchFilms(java.time.LocalDate date, String genre, java.math.BigDecimal prixMax) {
        List<djerbatourb.djerbatourb.entity.Film> allFilms = filmRepository.findAllByCinemaUtilisateurEstBloqueFalseOrderByIdDesc();
        List<djerbatourb.djerbatourb.entity.Film> result = new java.util.ArrayList<>();

        java.time.LocalDateTime now = java.time.LocalDateTime.now();

        for (djerbatourb.djerbatourb.entity.Film f : allFilms) {
            boolean match = true;

            // 0. Exclure les films passés (si la date est passée de plus d'une heure par exemple pour laisser une marge)
            if (f.getDateProjection() != null && f.getDateProjection().isBefore(now.minusHours(1))) {
                match = false;
            }

            // 1. Filtrage par Date (si spécifiée par l'utilisateur)
            if (match && date != null) {
                if (f.getDateProjection() == null || !f.getDateProjection().toLocalDate().equals(date)) {
                    match = false;
                }
            }

            // 2. Filtrage par Genre (si spécifié)
            if (match && genre != null && !genre.trim().isEmpty()) {
                String filmGenre = f.getGenre() != null ? normalizeString(f.getGenre()) : "";
                String searchGenre = normalizeString(genre);
                
                boolean genreMatch = filmGenre.contains(searchGenre) || searchGenre.contains(filmGenre);
                
                // Gestion spéciale des synonymes Comédie / Comedy
                if (!genreMatch) {
                    if ((searchGenre.contains("comed") && filmGenre.contains("comed")) ||
                        (searchGenre.contains("comedy") && filmGenre.contains("comed"))) {
                        genreMatch = true;
                    }
                }
                
                if (!genreMatch) {
                    match = false;
                }
            }

            // 3. Filtrage par Prix Max (si spécifié)
            if (match && prixMax != null) {
                if (f.getPrix() == null || f.getPrix().compareTo(prixMax) > 0) {
                    match = false;
                }
            }

            if (match) {
                result.add(f);
            }
        }

        return result;
    }

    private String normalizeString(String input) {
        if (input == null) return "";
        return java.text.Normalizer.normalize(input, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase();
    }

    /**
     * Cherche le cinéma par email de l'utilisateur.
     */
    public Cinema findByEmail(String email) {
        return repository.findByUtilisateurEmail(email)
                .orElseThrow(() -> new RuntimeException("Espace Cinéma non trouvé pour : " + email));
    }

    @Transactional
    public Cinema save(Cinema entity, String email) {
        // 1. Chercher le cinéma existant par l'email de son utilisateur
        Cinema existing = repository.findByUtilisateurEmail(email).orElse(null);
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

        // 3. Mise à jour des champs Cinema
        if (entity.getAdresse() != null) existing.setAdresse(entity.getAdresse());
        if (entity.getDescription() != null) existing.setDescription(entity.getDescription());
        if (entity.getLocalisation() != null) existing.setLocalisation(entity.getLocalisation());
        if (entity.getUrlImage() != null) existing.setUrlImage(entity.getUrlImage());

        boolean isNew = (existing.getId() == null);
        Cinema saved = repository.saveAndFlush(existing);

        if (isNew) {
            notificationService.notifyNewService("Cinéma", saved.getUtilisateur().getNom());
        } else {
            notificationService.notifyUpdatedService("Cinéma", saved.getUtilisateur().getNom());
        }

        return saved;
    }

    public Cinema update(Cinema entity) {
        if (entity == null) return null;
        return repository.save(entity);
    }

    public void deleteById(Long id) { 
        if (id == null) return;
        repository.deleteById(id); 
    }

    public java.util.Map<String, Object> getStats(String email) {
        Cinema cinema;
        try {
            cinema = findByEmail(email);
        } catch (RuntimeException e) {
            return java.util.Map.of("futureProjections", 0, "totalReservations", 0,
                    "chiffreAffaires", 0.0, "adminCommission", 0.0, "revenuNet", 0.0);
        }

        java.util.List<djerbatourb.djerbatourb.entity.Film> films = filmRepository.findByCinemaIdOrderByIdDesc(cinema.getId());

        // Réservations liées aux films de ce cinéma
        java.util.List<djerbatourb.djerbatourb.entity.Reservation> cinemaRes = reservationRepository.findAll().stream()
                .filter(r -> r.getFilm() != null
                        && r.getFilm().getCinema() != null
                        && r.getFilm().getCinema().getId().equals(cinema.getId())
                        && (r.getTypeReservation() != djerbatourb.djerbatourb.entity.TypeReservation.EN_LIGNE 
                                || r.getStatutPaiement() == djerbatourb.djerbatourb.entity.StatutPaiement.PAYE))
                .toList();

        java.util.Map<String, Object> stats = new java.util.HashMap<>();

        long futureProjections = films.stream()
                .filter(f -> f.getDateProjection() != null && f.getDateProjection().isAfter(java.time.LocalDateTime.now()))
                .count();
        stats.put("futureProjections", futureProjections);
        stats.put("totalReservations", cinemaRes.size());

        java.math.BigDecimal totalCommission = cinemaRes.stream()
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

        java.math.BigDecimal totalRevenuNet = cinemaRes.stream()
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
        
        java.util.Map<String, Object> statsRes = new java.util.HashMap<>();
        statsRes.put("futureProjections", futureProjections);
        statsRes.put("totalReservations", cinemaRes.stream().filter(r -> r.getStatut() == djerbatourb.djerbatourb.entity.Statut.CONFIRMEE).count());
        statsRes.put("chiffreAffaires", chiffreAffaires);
        statsRes.put("adminCommission", totalCommission);
        statsRes.put("revenuNet", totalRevenuNet);

        return statsRes;
    }
}
