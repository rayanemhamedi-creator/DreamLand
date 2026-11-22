package djerbatourb.djerbatourb.service;

import djerbatourb.djerbatourb.entity.Utilisateur;
import djerbatourb.djerbatourb.repository.*;
import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class UtilisateurService {
    private final UtilisateurRepository repository;
    private final HotelRepository hotelRepository;
    private final RestaurantRepository restaurantRepository;
    private final CinemaRepository cinemaRepository;
    private final SportRepository sportRepository;
    private final GuideRepository guideRepository;
    private final EvenementRepository evenementRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;

    public UtilisateurService(UtilisateurRepository repository,
                              HotelRepository hotelRepository,
                              RestaurantRepository restaurantRepository,
                              CinemaRepository cinemaRepository,
                              SportRepository sportRepository,
                              GuideRepository guideRepository,
                              EvenementRepository evenementRepository,
                              org.springframework.security.crypto.password.PasswordEncoder passwordEncoder,
                              NotificationService notificationService) { 
        this.repository = repository; 
        this.hotelRepository = hotelRepository;
        this.restaurantRepository = restaurantRepository;
        this.cinemaRepository = cinemaRepository;
        this.sportRepository = sportRepository;
        this.guideRepository = guideRepository;
        this.evenementRepository = evenementRepository;
        this.passwordEncoder = passwordEncoder;
        this.notificationService = notificationService;
    }

    public List<Utilisateur> findAll() { return repository.findAllByOrderByIdDesc(); }
    public Utilisateur findById(Long id) { 
        if (id == null) return null;
        return repository.findById(id).orElse(null); 
    }
    public Utilisateur save(Utilisateur entity) { 
        if (entity.getMotDePasse() != null && !entity.getMotDePasse().isEmpty()) {
            entity.setMotDePasse(passwordEncoder.encode(entity.getMotDePasse()));
        }
        return repository.save(entity); 
    }
    
    public Utilisateur update(Long id, Utilisateur updatedInfo) {
        if (id == null) throw new RuntimeException("ID manquant");
        Utilisateur existing = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        
        // Mise à jour des nouveaux champs de profil
        if (updatedInfo.getNom() != null) existing.setNom(updatedInfo.getNom());
        if (updatedInfo.getPrenom() != null) existing.setPrenom(updatedInfo.getPrenom());
        if (updatedInfo.getEmail() != null) existing.setEmail(updatedInfo.getEmail());
        if (updatedInfo.getTelephone() != null) existing.setTelephone(updatedInfo.getTelephone());
        
        if (updatedInfo.getMotDePasse() != null && !updatedInfo.getMotDePasse().isEmpty()) {
            existing.setMotDePasse(passwordEncoder.encode(updatedInfo.getMotDePasse()));
        }
        
        if (existing == null) return null;
        return repository.save(existing);
    }
    
    public void deleteById(Long id) { 
        if (id == null) return;
        repository.deleteById(id); 
    }
    
    public List<Utilisateur> findPendingValidations() {
        List<Utilisateur> pending = new ArrayList<>();
        
        // On récupère les utilisateurs dont l'entité liée n'est pas validée
        hotelRepository.findAll().stream().filter(h -> h.getValide() == null || !h.getValide()).forEach(h -> pending.add(h.getUtilisateur()));
        restaurantRepository.findAll().stream().filter(r -> r.getValide() == null || !r.getValide()).forEach(r -> pending.add(r.getUtilisateur()));
        cinemaRepository.findAll().stream().filter(c -> c.getValide() == null || !c.getValide()).forEach(c -> pending.add(c.getUtilisateur()));
        sportRepository.findAll().stream().filter(s -> s.getValide() == null || !s.getValide()).forEach(s -> pending.add(s.getUtilisateur()));
        guideRepository.findAll().stream().filter(g -> g.getValide() == null || !g.getValide()).forEach(g -> pending.add(g.getUtilisateur()));
        
        return pending.stream()
                .filter(u -> u != null && (u.getDemandeRefusee() == null || !u.getDemandeRefusee()))
                .distinct()
                .collect(Collectors.toList());
    }

    public void validateUser(Long id) {
        // On cherche l'entité liée à cet utilisateur et on la valide
        hotelRepository.findByUtilisateurId(id).ifPresent(h -> { h.setValide(true); hotelRepository.save(h); });
        restaurantRepository.findByUtilisateurId(id).ifPresent(r -> { r.setValide(true); restaurantRepository.save(r); });
        cinemaRepository.findByUtilisateurId(id).ifPresent(c -> { c.setValide(true); cinemaRepository.save(c); });
        sportRepository.findByUtilisateurId(id).ifPresent(s -> { s.setValide(true); sportRepository.save(s); });
        guideRepository.findByUtilisateurId(id).ifPresent(g -> { g.setValide(true); guideRepository.save(g); });
        
        repository.findById(id).ifPresent(u -> {
            u.setDemandeRefusee(false);
            repository.save(u);
            notificationService.notifyAdmin("✅ Prestataire VALIDÉ : " + u.getEmail());
        });
    }

    public void rejectUser(Long id) {
        repository.findById(id).ifPresent(u -> {
            u.setDemandeRefusee(true);
            repository.save(u);
            notificationService.notifyAdmin("❌ Prestataire REJETÉ : " + u.getEmail());
        });
    }

    public void changePassword(String email, String oldPassword, String newPassword) {
        if (email == null) throw new RuntimeException("Session expirée ou utilisateur non identifié.");
        
        Utilisateur user = repository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur [" + email + "] non trouvé en base."));
        
        if (oldPassword == null || oldPassword.isEmpty()) {
            throw new RuntimeException("L'ancien mot de passe doit être saisi.");
        }

        if (!passwordEncoder.matches(oldPassword, user.getMotDePasse())) {
            throw new RuntimeException("L'ancien mot de passe est incorrect (vérification échouée).");
        }
        
        user.setMotDePasse(passwordEncoder.encode(newPassword));
        repository.save(user);
    }

    public java.util.Map<String, Long> getPublicStats() {
        java.util.Map<String, Long> stats = new java.util.HashMap<>();
        stats.put("totalHotels", hotelRepository.count());
        stats.put("totalRestaurants", restaurantRepository.countByType(djerbatourb.djerbatourb.entity.TypeRestaurant.RESTAURANT));
        stats.put("totalCafes", restaurantRepository.countByType(djerbatourb.djerbatourb.entity.TypeRestaurant.CAFE));
        stats.put("totalCinemas", cinemaRepository.count());
        stats.put("totalGuides", guideRepository.count());
        stats.put("totalSports", sportRepository.count());
        stats.put("totalEvenements", evenementRepository.count());
        stats.put("totalTouristes", repository.countByRole(djerbatourb.djerbatourb.entity.Role.TOURISTE));
        return stats;
    }

    public java.util.Map<String, Object> getEtablissementByUtilisateurId(Long id) {
        java.util.Map<String, Object> res = new java.util.HashMap<>();
        if (id == null) {
            res.put("type", "UNKNOWN");
            return res;
        }

        var hotel = hotelRepository.findByUtilisateurId(id);
        if (hotel.isPresent()) {
            res.put("type", "HOTEL");
            res.put("id", hotel.get().getId());
            return res;
        }

        var resto = restaurantRepository.findByUtilisateurId(id);
        if (resto.isPresent()) {
            res.put("type", "RESTAURANT");
            res.put("id", resto.get().getId());
            return res;
        }

        var cinema = cinemaRepository.findByUtilisateurId(id);
        if (cinema.isPresent()) {
            res.put("type", "CINEMA");
            res.put("id", cinema.get().getId());
            return res;
        }

        var sport = sportRepository.findByUtilisateurId(id);
        if (sport.isPresent()) {
            res.put("type", "SPORT");
            res.put("id", sport.get().getId());
            return res;
        }

        var guide = guideRepository.findByUtilisateurId(id);
        if (guide.isPresent()) {
            res.put("type", "GUIDE");
            res.put("id", guide.get().getId());
            return res;
        }

        res.put("type", "UNKNOWN");
        return res;
    }
}
