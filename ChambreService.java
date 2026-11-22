package djerbatourb.djerbatourb.service;

import djerbatourb.djerbatourb.entity.Chambre;
import djerbatourb.djerbatourb.entity.Hotel;
import djerbatourb.djerbatourb.entity.Statut;
import djerbatourb.djerbatourb.repository.ChambreRepository;
import djerbatourb.djerbatourb.repository.HotelRepository;
import djerbatourb.djerbatourb.repository.ReservationRepository;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ChambreService {
    private final ChambreRepository repository;
    private final HotelService hotelService;
    private final HotelRepository hotelRepository;
    private final ReservationRepository reservationRepository;
    private final NotificationService notificationService;

    public ChambreService(ChambreRepository repository,
                          @Lazy HotelService hotelService,
                          HotelRepository hotelRepository,
                          ReservationRepository reservationRepository,
                          NotificationService notificationService) {
        this.repository = repository;
        this.hotelService = hotelService;
        this.hotelRepository = hotelRepository;
        this.reservationRepository = reservationRepository;
        this.notificationService = notificationService;
    }

    public List<Chambre> findAll() {
        return repository.findAllByOrderByIdDesc();
    }

    /**
     * Récupère les chambres de l'hôtel de l'utilisateur connecté.
     * Passe par HotelService.findByEmail qui effectue la réparation automatique
     * si le lien utilisateur <-> hôtel a été rompu.
     */
    public List<Chambre> findByMyHotel(String email) {
        Hotel h = hotelService.findByEmail(email);
        if (h == null) return Collections.emptyList();
        return repository.findByHotelIdOrderByIdDesc(h.getId());
    }

    public Chambre save(Chambre entity) {
        if (entity == null) return null;
        return repository.save(entity);
    }

    @Transactional
    public Chambre update(Chambre entity) {
        if (entity == null) return null;
        Chambre saved = repository.save(entity);
        notificationService.notifyUpdatedService("Chambre", saved.getType());
        return saved;
    }

    /**
     * Ajoute une chambre et la lie automatiquement à l'hôtel du prestataire connecté.
     * Utilise HotelService pour bénéficier de la réparation automatique du lien.
     */
    @Transactional
    public Chambre addRoomToHotel(Chambre entity, String email) {
        try {
            System.out.println("🔍 Tentative d'ajout/MAJ chambre pour l'utilisateur: " + email);
            
            // On récupère l'hôtel via le repository directement pour être sûr qu'il est géré
            Hotel myHotel = hotelRepository.findByUtilisateurEmail(email).orElse(null);
            
            if (myHotel == null) {
                System.err.println("❌ Hôtel non trouvé pour l'email: " + email);
                throw new RuntimeException("Hôtel non trouvé pour cet utilisateur : " + email);
            }
            
            System.out.println("✅ Hôtel identifié: ID=" + myHotel.getId() + ", Nom=" + myHotel.getUtilisateur().getNom());

            Chambre toSave;
            boolean isUpdate = (entity.getId() != null);

            if (isUpdate) {
                toSave = repository.findById(entity.getId())
                        .orElseThrow(() -> new RuntimeException("Chambre introuvable avec l'ID: " + entity.getId()));
                
                // Vérification de sécurité : la chambre doit appartenir au même hôtel
                if (toSave.getHotel() != null && !toSave.getHotel().getId().equals(myHotel.getId())) {
                    throw new RuntimeException("Accès refusé : Cette chambre n'appartient pas à votre hôtel.");
                }
            } else {
                toSave = new Chambre();
            }

            // Mapping manuel des champs pour garantir l'intégrité
            toSave.setHotel(myHotel); // mapping crucial
            toSave.setNumero(entity.getNumero());
            toSave.setType(entity.getType());
            toSave.setPrix(entity.getPrix());
            toSave.setCapacite(entity.getCapacite());
            toSave.setNombreTotal(entity.getNombreTotal());
            toSave.setUrlImage(entity.getUrlImage());
            toSave.setDescription(entity.getDescription());
            
            // Nouveaux champs de prix par âge
            toSave.setPrixParAdulte(entity.getPrixParAdulte());
            toSave.setPrixParEnfant3_10(entity.getPrixParEnfant3_10());
            toSave.setPrixParEnfant11_17(entity.getPrixParEnfant11_17());
            toSave.setPrixLibre(entity.getPrixLibre());
            
            // Configuration des lits
            toSave.setNbLitsSimples(entity.getNbLitsSimples() != null ? entity.getNbLitsSimples() : 0);
            toSave.setNbLitsDoubles(entity.getNbLitsDoubles() != null ? entity.getNbLitsDoubles() : 0);
            
            // Prestations (Booleans)
            toSave.setAWifi(Boolean.TRUE.equals(entity.getAWifi()));
            toSave.setAClimatisation(Boolean.TRUE.equals(entity.getAClimatisation()));
            toSave.setASmartTv(Boolean.TRUE.equals(entity.getASmartTv()));
            toSave.setACoffreFort(Boolean.TRUE.equals(entity.getACoffreFort()));
            toSave.setABureau(Boolean.TRUE.equals(entity.getABureau()));
            toSave.setABalcon(Boolean.TRUE.equals(entity.getABalcon()));
            toSave.setAVueSurMer(Boolean.TRUE.equals(entity.getAVueSurMer()));
            
            // Valeur par défaut si non spécifié
            toSave.setDisponible(entity.isDisponible() != null ? entity.isDisponible() : true);

            System.out.println("💾 Sauvegarde de la chambre " + toSave.getNumero() + " pour l'hôtel ID " + myHotel.getId());
            Chambre saved = repository.save(toSave);
            repository.flush(); 
            
            System.out.println("🚀 Chambre enregistrée avec succès! ID=" + saved.getId());

            // Notifications
            try {
                if (isUpdate) {
                    notificationService.notifyUpdatedService("Chambre", saved.getType());
                } else {
                    String hotelNom = (myHotel.getUtilisateur() != null) ? myHotel.getUtilisateur().getNom() : "Hôtel " + myHotel.getId();
                    notificationService.notifyNewService("Nouvelle Chambre à " + hotelNom, saved.getType());
                }
            } catch (Exception notifyErr) {
                System.err.println("⚠️ Erreur lors de l'envoi de la notification: " + notifyErr.getMessage());
                // On ne fait pas échouer l'enregistrement pour une notification ratée
            }
            
            return saved;
        } catch (Exception e) {
            System.err.println("❌ CRASH lors de l'enregistrement de la chambre : " + e.getMessage());
            e.printStackTrace();
            throw e; 
        }
    }

    public Chambre findById(Long id) {
        if (id == null) return null;
        return repository.findById(id).orElse(null);
    }

    public List<Chambre> findByHotelId(Long hotelId) {
        return repository.findByHotelIdOrderByIdDesc(hotelId);
    }

    @Transactional
    public void deleteById(Long id) {
        if (id == null) return;
        Chambre ch = repository.findById(id).orElse(null);
        if (ch != null) {
            List<Long> affectedUserIds = reservationRepository.findByChambreIdAndStatut(id, Statut.CONFIRMEE)
                    .stream()
                    .map(r -> r.getUtilisateur().getId())
                    .collect(Collectors.toList());
            
            notificationService.notifyDeletedService("Chambre", ch.getType(), affectedUserIds);
            repository.deleteById(id);
        }
    }

    /**
     * Définit une période d'indisponibilité pour une chambre.
     * Vérifie qu'aucune réservation active ne chevauche la période demandée.
     */
    @Transactional
    public Chambre addIndisponibilite(Long chambreId, LocalDateTime debut, LocalDateTime fin) {
        if (chambreId == null || debut == null || fin == null) {
            throw new RuntimeException("Paramètres manquants.");
        }
        if (!debut.isBefore(fin)) {
            throw new RuntimeException("La date de début doit être avant la date de fin.");
        }

        Chambre chambre = repository.findById(chambreId)
                .orElseThrow(() -> new RuntimeException("Chambre introuvable."));

        // Vérification : aucune réservation active (non annulée) sur cette période
        Integer overlapping = reservationRepository.sumReservedRooms(chambreId, debut, fin);
        if (overlapping != null && overlapping > 0) {
            throw new RuntimeException(
                "Impossible de bloquer cette chambre : " + overlapping +
                " réservation(s) active(s) existent sur cette période."
            );
        }

        chambre.setDateDebutIndisponibilite(debut);
        chambre.setDateFinIndisponibilite(fin);
        return repository.save(chambre);
    }

    /**
     * Supprime la période d'indisponibilité d'une chambre (la rend disponible à nouveau).
     */
    @Transactional
    public Chambre deleteIndisponibilite(Long chambreId) {
        Chambre chambre = repository.findById(chambreId)
                .orElseThrow(() -> new RuntimeException("Chambre introuvable."));
        chambre.setDateDebutIndisponibilite(null);
        chambre.setDateFinIndisponibilite(null);
        return repository.save(chambre);
    }
}
