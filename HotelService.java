package djerbatourb.djerbatourb.service;

import djerbatourb.djerbatourb.entity.Hotel;
import djerbatourb.djerbatourb.entity.Chambre;
import djerbatourb.djerbatourb.entity.Utilisateur;
import djerbatourb.djerbatourb.entity.Statut;
import djerbatourb.djerbatourb.repository.HotelRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.ArrayList;
import java.util.stream.Collectors;
import java.time.LocalDateTime;
import java.math.BigDecimal;

@Service
public class HotelService {
    private final HotelRepository repository;
    private final djerbatourb.djerbatourb.repository.ChambreRepository chambreRepository;
    private final djerbatourb.djerbatourb.repository.ReservationRepository reservationRepository;
    private final djerbatourb.djerbatourb.repository.UtilisateurRepository utilisateurRepository;
    private final PriceService priceService;
    private final NotificationService notificationService;

    public HotelService(HotelRepository repository, 
                        djerbatourb.djerbatourb.repository.ChambreRepository chambreRepository,
                        djerbatourb.djerbatourb.repository.ReservationRepository reservationRepository,
                        djerbatourb.djerbatourb.repository.UtilisateurRepository utilisateurRepository,
                        PriceService priceService,
                        NotificationService notificationService) { 
        this.repository = repository;
        this.chambreRepository = chambreRepository;
        this.reservationRepository = reservationRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.priceService = priceService;
        this.notificationService = notificationService;
    }
    public List<Hotel> findAll() { return repository.findAllByUtilisateurEstBloqueFalse(); }
    public Hotel findByEmail(String email) { 
        return repository.findByUtilisateurEmail(email).orElse(null);
    }

    public Hotel findById(Long id) { 
        if (id == null) return null;
        return repository.findById(id).orElse(null); 
    }

    @Transactional
    public Hotel save(Hotel entity, String email) {
        // 1. Chercher par l'email pour s'assurer que c'est bien l'hôtel du prestataire
        Hotel ownerHotel = repository.findByUtilisateurEmail(email).orElse(null);
        if (ownerHotel == null) {
            throw new RuntimeException("Accès refusé ou hôtel non trouvé.");
        }

        // 2. Mise à jour de l'Utilisateur lié
        if (entity.getUtilisateur() != null && ownerHotel.getUtilisateur() != null) {
            Utilisateur u = ownerHotel.getUtilisateur();
            u.setNom(entity.getUtilisateur().getNom());
            u.setTelephone(entity.getUtilisateur().getTelephone());
            
            // Mise à jour de l'email avec vérification d'unicité
            String newEmail = entity.getUtilisateur().getEmail();
            if (newEmail != null && !newEmail.equalsIgnoreCase(u.getEmail())) {
                if (utilisateurRepository.existsByEmail(newEmail)) {
                    throw new RuntimeException("Cet email est déjà utilisé par un autre compte.");
                }
                u.setEmail(newEmail);
            }

            // Sync de l'image utilisateur avec l'image de l'hôtel si fournie
            if (entity.getUrlImage() != null) {
                u.setUrlImage(entity.getUrlImage());
            }
            
            utilisateurRepository.saveAndFlush(u);
        }

        // 3. Mise à jour des champs Hotel
        ownerHotel.setAdresse(entity.getAdresse());
        ownerHotel.setDescription(entity.getDescription());
        ownerHotel.setLocalisation(entity.getLocalisation());
        ownerHotel.setPrix(entity.getPrix());
        ownerHotel.setUrlImage(entity.getUrlImage());

        // Formules
        ownerHotel.setPrixRO(entity.getPrixRO());
        ownerHotel.setPrixBB(entity.getPrixBB());
        ownerHotel.setPrixHB(entity.getPrixHB());
        ownerHotel.setPrixFB(entity.getPrixFB());
        ownerHotel.setPrixSoftAI(entity.getPrixSoftAI());
        ownerHotel.setPrixAllInclusive(entity.getPrixAllInclusive());
        // Services (Booleans)
        ownerHotel.setAReception24h(Boolean.TRUE.equals(entity.getAReception24h()));
        ownerHotel.setASecurite24h(Boolean.TRUE.equals(entity.getASecurite24h()));
        ownerHotel.setAWifiGenerale(Boolean.TRUE.equals(entity.getAWifiGenerale()));
        ownerHotel.setAParking(Boolean.TRUE.equals(entity.getAParking()));
        ownerHotel.setAAscenseur(Boolean.TRUE.equals(entity.getAAscenseur()));
        ownerHotel.setAPiscine(Boolean.TRUE.equals(entity.getAPiscine()));
        ownerHotel.setAServiceReception(Boolean.TRUE.equals(entity.getAServiceReception()));

        Hotel saved = repository.saveAndFlush(ownerHotel);
        notificationService.notifyUpdatedService("Hôtel", saved.getUtilisateur().getNom());
        
        return saved;
    }

    @Transactional
    public Hotel update(Hotel hotel) {
        if (hotel == null) return null;
        Hotel saved = repository.save(hotel);
        notificationService.notifyUpdatedService("Hôtel", saved.getUtilisateur().getNom());
        return saved;
    }
    @Transactional
    public void deleteById(Long id) { 
        if (id == null) return;
        Hotel hotel = repository.findById(id).orElse(null);
        if (hotel != null) {
            List<Long> affectedUserIds = reservationRepository.findByHotelId(id)
                    .stream()
                    .filter(r -> r.getStatut() == Statut.CONFIRMEE)
                    .map(r -> r.getUtilisateur().getId())
                    .collect(Collectors.toList());
            
            notificationService.notifyDeletedService("Hôtel", hotel.getUtilisateur().getNom(), affectedUserIds);
            repository.deleteById(id); 
        }
    }

    public djerbatourb.djerbatourb.dto.HotelStatsDTO getStats(String email) {
        Hotel h = findByEmail(email);
        if (h == null) return new djerbatourb.djerbatourb.dto.HotelStatsDTO(0, 0, java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO);

        Long hotId = h.getId();
        
        // 1. Chambres Totales
        Integer totalRooms = chambreRepository.findByHotelIdOrderByIdDesc(hotId).stream()
                .mapToInt(ch -> ch.getNombreTotal() != null ? ch.getNombreTotal() : 0)
                .sum();
        
        // 2. Toutes les réservations
        java.util.List<djerbatourb.djerbatourb.entity.Reservation> allRes = reservationRepository.findByHotelId(hotId).stream()
                .filter(r -> r.getTypeReservation() != djerbatourb.djerbatourb.entity.TypeReservation.EN_LIGNE 
                        || r.getStatutPaiement() == djerbatourb.djerbatourb.entity.StatutPaiement.PAYE)
                .collect(java.util.stream.Collectors.toList());
        
        // 3. Calcul Financier (On exclut EN_ATTENTE qui n'a pas encore de prix définitif)
        java.math.BigDecimal totalComm = allRes.stream()
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
        
        java.math.BigDecimal totalGain = allRes.stream()
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

        java.math.BigDecimal ca = totalComm.add(totalGain);
        
        // 4. Réservations Confirmées (Comptage des dossiers clients)
        int reserved = (int) allRes.stream()
            .filter(r -> r.getStatut() == djerbatourb.djerbatourb.entity.Statut.CONFIRMEE)
            .count();

        return new djerbatourb.djerbatourb.dto.HotelStatsDTO(totalRooms, reserved, ca, totalComm, totalGain);
    }

    private void cancelExpiredPendingReservations() {
        try {
            LocalDateTime limit = LocalDateTime.now().minusMinutes(15);
            List<djerbatourb.djerbatourb.entity.Reservation> pending = reservationRepository.findAll().stream()
                    .filter(r -> r.getStatut() == djerbatourb.djerbatourb.entity.Statut.EN_ATTENTE 
                            && r.getDateCreation() != null 
                            && r.getDateCreation().isBefore(limit))
                    .collect(Collectors.toList());
            for (djerbatourb.djerbatourb.entity.Reservation r : pending) {
                r.setStatut(djerbatourb.djerbatourb.entity.Statut.ANNULEE);
                r.setStatutPaiement(djerbatourb.djerbatourb.entity.StatutPaiement.ECHOUE);
                reservationRepository.save(r);
                System.out.println("⏰ Annulation automatique de la réservation en attente expirée ID: " + r.getId());
            }
        } catch (Exception e) {
            System.err.println("⚠️ Erreur lors du nettoyage des réservations expirées: " + e.getMessage());
        }
    }

    public List<Hotel> searchHotels(LocalDateTime dateDebut, LocalDateTime dateFin, int nbChambres, int nbAdultes, int nbEnfants, BigDecimal prixMax) {
        cancelExpiredPendingReservations();
        List<Hotel> allHotels = repository.findAllByUtilisateurEstBloqueFalse();
        List<Hotel> matchedHotels = new ArrayList<>();

        for (Hotel h : allHotels) {
            List<Chambre> rooms = chambreRepository.findByHotelIdOrderByIdDesc(h.getId());
            boolean hasSuitableRoom = false;
            
            // Si le prixMax est spécifié, on vérifie d'abord le prix de base de l'hôtel ou de ses chambres
            if (prixMax != null) {
                boolean priceOk = (h.getPrix() != null && h.getPrix().compareTo(prixMax) <= 0);
                if (!priceOk) {
                    // Vérifier si au moins une chambre est dans le budget
                    priceOk = rooms.stream().anyMatch(c -> c.getPrix() != null && c.getPrix().compareTo(prixMax) <= 0);
                }
                if (!priceOk) continue; // Skip this hotel
            }

            // Vérification de la capacité (Adultes + Enfants)
            // On cherche si l'hôtel peut accueillir tout le groupe dans nbChambres
            List<Integer> availableCapacities = new ArrayList<>();
            for (Chambre c : rooms) {
                if (!Boolean.TRUE.equals(c.isDisponible())) continue;

                // Ignorer les chambres ayant une période d'indisponibilité chevauchant les dates de recherche
                if (dateDebut != null && dateFin != null
                        && c.getDateDebutIndisponibilite() != null
                        && c.getDateFinIndisponibilite() != null
                        && c.getDateDebutIndisponibilite().isBefore(dateFin)
                        && c.getDateFinIndisponibilite().isAfter(dateDebut)) {
                    continue;
                }

                int overlapping = 0;
                if (dateDebut != null && dateFin != null) {
                    Integer res = reservationRepository.sumReservedRooms(c.getId(), dateDebut, dateFin);
                    if (res != null) overlapping = res;
                }
                
                int total = c.getNombreTotal() != null ? c.getNombreTotal() : 1;
                int availableCount = total - overlapping;
                
                for (int i = 0; i < availableCount; i++) {
                    availableCapacities.add(c.getCapacite() != null ? c.getCapacite() : 0);
                }
            }

            if (availableCapacities.size() >= nbChambres) {
                availableCapacities.sort((cap1, cap2) -> Integer.compare(cap2, cap1));
                int maxCapacity = availableCapacities.stream()
                    .limit(nbChambres)
                    .mapToInt(Integer::intValue)
                    .sum();
                
                if (maxCapacity >= (nbAdultes + nbEnfants)) {
                    matchedHotels.add(h);
                }
            }
        }
        
        return matchedHotels;
    }
}
