package djerbatourb.djerbatourb.service;

import djerbatourb.djerbatourb.dto.DynamicRegisterRequest;
import djerbatourb.djerbatourb.entity.*;
import djerbatourb.djerbatourb.repository.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UtilisateurRepository userRepository;
    private final HotelRepository hotelRepository;
    private final RestaurantRepository restaurantRepository;
    private final CinemaRepository cinemaRepository;
    private final SportRepository sportRepository;
    private final GuideRepository guideRepository;
    private final AdminRepository adminRepository;
    private final TouristeRepository touristeRepository;
    private final NotificationService notificationService;
    private final PasswordEncoder encoder;

    // Explicit constructor to avoid Lombok issues
    public AuthService(UtilisateurRepository userRepository, HotelRepository hotelRepository, RestaurantRepository restaurantRepository,
                       CinemaRepository cinemaRepository, SportRepository sportRepository,
                       GuideRepository guideRepository, AdminRepository adminRepository, 
                       TouristeRepository touristeRepository, NotificationService notificationService, PasswordEncoder encoder) {
        this.userRepository = userRepository;
        this.hotelRepository = hotelRepository;
        this.restaurantRepository = restaurantRepository;
        this.cinemaRepository = cinemaRepository;
        this.sportRepository = sportRepository;
        this.guideRepository = guideRepository;
        this.adminRepository = adminRepository;
        this.touristeRepository = touristeRepository;
        this.notificationService = notificationService;
        this.encoder = encoder;
    }

    @Transactional
    public String registerUser(DynamicRegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Erreur : L'email est déjà utilisé !");
        }

        Role userRole = Role.TOURISTE;
        if (request.getRole() != null) {
            try {
                userRole = Role.valueOf(request.getRole().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new RuntimeException("Erreur : Le rôle spécifié n'existe pas !");
            }
        }

        // 1. Créer et remplir l'utilisateur (toujours requis)
        Utilisateur user = new Utilisateur();
        user.setEmail(request.getEmail());
        user.setMotDePasse(encoder.encode(request.getMotDePasse()));
        user.setEstBloque(false);
        user.setRole(userRole);
        user.setTelephone(request.getTelephone() != null ? request.getTelephone() : "");

        // Profil de base
        user.setNom(request.getNom() != null ? request.getNom() : "");
        user.setPrenom(request.getPrenom() != null ? request.getPrenom() : "");

        // Sauvegarder l'utilisateur d'abord pour avoir l'ID
        userRepository.save(user);

        // 2. Si c'est un prestataire, créer l'entité spécifique et la lier
        switch (userRole) {
            case HOTEL:
                Hotel hotel = new Hotel();
                hotel.setUtilisateur(user);
                hotel.setAdresse(request.getLocalisation() != null ? request.getLocalisation() : "");
                hotel.setDescription(request.getDescription());
                if (request.getNomHotel() != null) user.setNom(request.getNomHotel()); 
                hotelRepository.save(hotel);
                break;
            case RESTAURANT:
            case CAFE:
                Restaurant resto = new Restaurant();
                resto.setUtilisateur(user);
                resto.setType(userRole == Role.CAFE ? TypeRestaurant.CAFE : TypeRestaurant.RESTAURANT);
                resto.setAdresse(request.getLocalisation() != null ? request.getLocalisation() : "");
                String restoDesc = request.getDescription() != null ? request.getDescription() : "";
                if (request.getHoraires() != null) {
                    restoDesc += " | Horaires: " + request.getHoraires();
                }
                resto.setDescription(restoDesc);
                restaurantRepository.save(resto);
                break;
            case CINEMA:
                Cinema cinema = new Cinema();
                cinema.setUtilisateur(user);
                cinema.setAdresse(request.getLocalisation() != null ? request.getLocalisation() : "");
                String cinemaDesc = request.getDescription() != null ? request.getDescription() : "";
                if (request.getNombrePlaces() != null) {
                    cinemaDesc += " | Places Max: " + request.getNombrePlaces();
                }
                cinema.setDescription(cinemaDesc);
                cinemaRepository.save(cinema);
                break;
            case SPORT:
                Sport sport = new Sport();
                sport.setUtilisateur(user);
                sport.setNomActivite(request.getNomActivite() != null ? request.getNomActivite() : request.getNom());
                sport.setLieu(request.getLocalisation() != null ? request.getLocalisation() : "");
                sport.setAdresse(request.getLocalisation() != null ? request.getLocalisation() : "");
                sport.setPrix(request.getPrix() != null ? request.getPrix() : 0.0);
                String sportDesc = request.getDescription() != null ? request.getDescription() : "";
                if (request.getHoraires() != null) {
                    sportDesc += " | Horaires: " + request.getHoraires();
                }
                sport.setDescription(sportDesc);
                sportRepository.save(sport);
                break;
            case GUIDE:
                Guide guide = new Guide();
                guide.setUtilisateur(user);
                guide.setAdresse(request.getLocalisation() != null ? request.getLocalisation() : "");
                guide.setDescription(request.getDescription());
                guideRepository.save(guide);
                break;
            case TOURISTE:
                Touriste touriste = new Touriste(user);
                touristeRepository.save(touriste);
                break;
            case ADMIN:
                Admin admin = new Admin(user);
                adminRepository.save(admin);
                break;
            default:
                break;
        }

        // Sauvegarder à nouveau l'utilisateur si on a modifié son nom/description dans le switch
        userRepository.save(user);

        // Notify Admin
        notificationService.notifyAdmin("Nouvelle inscription : " + user.getEmail() + " en tant que " + userRole.name());

        return "Utilisateur et profil " + userRole.name() + " enregistrés avec succès !";
    }

    public boolean isProviderValidated(Long userId, String role) {
        if (role == null) return true;
        return switch (role.toUpperCase()) {
            case "HOTEL" -> hotelRepository.findByUtilisateurId(userId).map(Hotel::getValide).orElse(false);
            case "RESTAURANT", "CAFE" -> restaurantRepository.findByUtilisateurId(userId).map(Restaurant::getValide).orElse(false);
            case "CINEMA" -> cinemaRepository.findByUtilisateurId(userId).map(Cinema::getValide).orElse(false);
            case "SPORT" -> sportRepository.findByUtilisateurId(userId).map(Sport::getValide).orElse(false);
            case "GUIDE" -> guideRepository.findByUtilisateurId(userId).map(Guide::getValide).orElse(false);
            default -> true;
        };
    }

    public boolean isProviderRejected(Long userId) {
        return userRepository.findById(userId)
                .map(u -> u.getDemandeRefusee() != null && u.getDemandeRefusee())
                .orElse(false);
    }

    public Utilisateur getAdminUser() {
        Utilisateur admin = userRepository.findAllByRole(Role.ADMIN).stream().findFirst().orElse(null);
        if (admin != null && admin.getUrlImage() == null) {
            admin.setUrlImage("https://cdn-icons-png.flaticon.com/512/3135/3135715.png"); // Default professional admin icon
        }
        return admin;
    }

    public Utilisateur getCurrentUser() {
        String email = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
    }
}
