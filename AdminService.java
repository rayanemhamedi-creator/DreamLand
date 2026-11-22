package djerbatourb.djerbatourb.service;

import djerbatourb.djerbatourb.dto.AdminStatisticsDTO;
import djerbatourb.djerbatourb.entity.Role;
import djerbatourb.djerbatourb.entity.Utilisateur;
import djerbatourb.djerbatourb.repository.ReservationRepository;
import djerbatourb.djerbatourb.repository.UtilisateurRepository;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

@Service
public class AdminService {
    private final UtilisateurRepository utilisateurRepository;
    private final ReservationRepository reservationRepository;
    private final NotificationService notificationService;

    public AdminService(UtilisateurRepository utilisateurRepository,
                        ReservationRepository reservationRepository,
                        NotificationService notificationService) {
        this.utilisateurRepository = utilisateurRepository;
        this.reservationRepository = reservationRepository;
        this.notificationService = notificationService;
    }

    public List<Utilisateur> getTousLesUtilisateurs() {
        return utilisateurRepository.findAllByOrderByIdDesc();
    }

    public void bloquerUtilisateur(Long id, boolean bloquer) {
        if (id == null) return;
        Utilisateur user = utilisateurRepository.findById(id).orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        user.setEstBloque(bloquer);
        utilisateurRepository.save(user);
        notificationService.notifyAdmin((bloquer ? "Utilisateur BLOQUÉ" : "Utilisateur DÉBLOQUÉ") + " : " + user.getEmail());
    }

    public AdminStatisticsDTO getStatistiques() {
        AdminStatisticsDTO stats = new AdminStatisticsDTO();

        long total = utilisateurRepository.count();
        long touristes = utilisateurRepository.countByRole(Role.TOURISTE);
        long admins = utilisateurRepository.countByRole(Role.ADMIN);

        // Per-role provider counts
        long hotels      = utilisateurRepository.countByRole(Role.HOTEL);
        long restaurants = utilisateurRepository.countByRole(Role.RESTAURANT);
        long cafes       = utilisateurRepository.countByRole(Role.CAFE);
        long cinemas     = utilisateurRepository.countByRole(Role.CINEMA);
        long sports      = utilisateurRepository.countByRole(Role.SPORT);
        long guides      = utilisateurRepository.countByRole(Role.GUIDE);

        stats.setTotalUsers(total);
        stats.setTotalTouristes(touristes);
        stats.setTotalPrestataires(hotels + restaurants + cafes + cinemas + sports + guides);

        stats.setTotalHotels(hotels);
        stats.setTotalRestaurants(restaurants);
        stats.setTotalCafes(cafes);
        stats.setTotalCinemas(cinemas);
        stats.setTotalSports(sports);
        stats.setTotalGuides(guides);

        Double rev1 = reservationRepository.sumAllRevenues(
                Arrays.asList(djerbatourb.djerbatourb.entity.Statut.CONFIRMEE,
                              djerbatourb.djerbatourb.entity.Statut.PASSEE));
        double totalRev = (rev1 != null ? rev1 : 0.0);

        stats.setTotalRevenu(totalRev);
        stats.setTotalCommissions(totalRev * 0.10);

        return stats;
    }
}
