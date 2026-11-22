package djerbatourb.djerbatourb.service;

import djerbatourb.djerbatourb.entity.Statut;
import djerbatourb.djerbatourb.repository.ReservationRepository;
import djerbatourb.djerbatourb.entity.Film;
import djerbatourb.djerbatourb.repository.FilmRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class FilmService {
    private final FilmRepository repository;
    private final CinemaService cinemaService;
    private final ReservationRepository reservationRepository;
    private final NotificationService notificationService;

    public FilmService(FilmRepository repository, 
                       CinemaService cinemaService, 
                       ReservationRepository reservationRepository,
                       NotificationService notificationService) {
        this.repository = repository;
        this.cinemaService = cinemaService;
        this.reservationRepository = reservationRepository;
        this.notificationService = notificationService;
    }

    public List<Film> findAll() { return repository.findAllByCinemaUtilisateurEstBloqueFalseOrderByIdDesc(); }
    public List<Film> findByCinemaEmail(String email) {
        return repository.findByCinemaUtilisateurEmailOrderByIdDesc(email);
    }
    public List<Film> findByCinemaId(Long id) {
        return repository.findByCinemaIdOrderByIdDesc(id);
    }

    @Transactional
    public Film addFilmToCinema(Film entity, String email) {
        if (entity.getDateProjection() != null && entity.getDateProjection().isBefore(java.time.LocalDateTime.now())) {
            throw new RuntimeException("Vous ne pouvez pas créer une séance pour une date déjà passée.");
        }
        djerbatourb.djerbatourb.entity.Cinema cinema = cinemaService.findByEmail(email);
        entity.setCinema(cinema);
        
        boolean isUpdate = (entity.getId() != null);
        Film saved = repository.save(entity);
        
        if (isUpdate) {
            notificationService.notifyUpdatedService("Film", saved.getTitre());
        } else {
            notificationService.notifyNewService("Film au Cinéma " + cinema.getUtilisateur().getNom(), saved.getTitre());
        }
        
        return saved;
    }

    public Film findById(Long id) { 
        if (id == null) return null;
        return repository.findById(id).orElse(null); 
    }
    public Film save(Film entity) { 
        if (entity == null) return null;
        return repository.save(entity); 
    }
    @Transactional
    public Film update(Film entity) { 
        if (entity == null) return null;
        Film saved = repository.save(entity);
        notificationService.notifyUpdatedService("Film", saved.getTitre());
        return saved;
    }
    @Transactional
    public void deleteById(Long id) { 
        if (id == null) return;
        Film film = repository.findById(id).orElse(null);
        if (film != null) {
            List<Long> affectedUserIds = reservationRepository.findByFilmIdAndStatut(id, Statut.CONFIRMEE)
                    .stream()
                    .map(r -> r.getUtilisateur().getId())
                    .collect(Collectors.toList());
            
            notificationService.notifyDeletedService("Film", film.getTitre(), affectedUserIds);
            repository.deleteById(id); 
        }
    }
}
