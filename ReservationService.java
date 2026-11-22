package djerbatourb.djerbatourb.service;

import djerbatourb.djerbatourb.dto.OfflineReservationRequest;
import djerbatourb.djerbatourb.dto.ReservationResponse;
import djerbatourb.djerbatourb.dto.MenuSelectionDTO;
import djerbatourb.djerbatourb.dto.HotelReservationRequest;
import djerbatourb.djerbatourb.dto.RestaurantReservationRequest;
import djerbatourb.djerbatourb.dto.TicketReservationRequest;
import djerbatourb.djerbatourb.dto.SportReservationRequest;
import djerbatourb.djerbatourb.dto.SortieReservationRequest;
import djerbatourb.djerbatourb.dto.ReservationDetailsRequest;
import djerbatourb.djerbatourb.entity.*;
import djerbatourb.djerbatourb.repository.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.math.BigDecimal;

@Service
public class ReservationService {
    private final ReservationRepository reservationRepository;
    private final ChambreRepository chambreRepository;
    private final TableRestoRepository tableRestoRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final FilmRepository filmRepository;
    private final SportRepository sportRepository;
    private final SortieRepository sortieRepository;
    private final EvenementRepository evenementRepository;
    private final MaterielSportRepository materielSportRepository;
    private final HotelRepository hotelRepository;
    private final RestaurantRepository restaurantRepository;
    private final CinemaRepository cinemaRepository;
    private final GuideRepository guideRepository;
    private final NotificationService notificationService;
    private final MenuRepository menuRepository;

    private final PriceService priceService;
    private final StripePaymentService stripePaymentService;

    public ReservationService(ReservationRepository reservationRepository,
            ChambreRepository chambreRepository,
            TableRestoRepository tableRestoRepository,
            UtilisateurRepository utilisateurRepository,
            FilmRepository filmRepository,
            SportRepository sportRepository,
            SortieRepository sortieRepository,
            EvenementRepository evenementRepository,
            MaterielSportRepository materielSportRepository,
            HotelRepository hotelRepository,
            RestaurantRepository restaurantRepository,
            CinemaRepository cinemaRepository,
            GuideRepository guideRepository,
            PriceService priceService,
            NotificationService notificationService,
            StripePaymentService stripePaymentService,
            MenuRepository menuRepository) {
        this.reservationRepository = reservationRepository;
        this.chambreRepository = chambreRepository;
        this.tableRestoRepository = tableRestoRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.stripePaymentService = stripePaymentService;
        this.filmRepository = filmRepository;
        this.sportRepository = sportRepository;
        this.sortieRepository = sortieRepository;
        this.evenementRepository = evenementRepository;
        this.materielSportRepository = materielSportRepository;
        this.hotelRepository = hotelRepository;
        this.restaurantRepository = restaurantRepository;
        this.cinemaRepository = cinemaRepository;
        this.guideRepository = guideRepository;
        this.priceService = priceService;
        this.notificationService = notificationService;
        this.menuRepository = menuRepository;
    }

    private Utilisateur getCurrentUser() {
        // Récupère l'utilisateur connecté via Spring Security
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String currentEmail = (principal instanceof UserDetails) ? ((UserDetails) principal).getUsername()
                : principal.toString();
        return utilisateurRepository.findByEmail(currentEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public List<Reservation> findAll() {
        return reservationRepository.findAllByOrderByIdDesc();
    }

    public List<Reservation> findMyHotelReservations() {
        Utilisateur current = getCurrentUser();
        // Recherche de l'hôtel lié à l'utilisateur
        Hotel hotel = hotelRepository.findByUtilisateurId(current.getId()).orElse(null);
        if (hotel == null)
            return java.util.Collections.emptyList();

        List<Reservation> list = reservationRepository.findByHotelId(hotel.getId())
                .stream()
                .filter(r -> r.getTypeReservation() != TypeReservation.EN_LIGNE || r.getStatutPaiement() == StatutPaiement.PAYE)
                .collect(java.util.stream.Collectors.toList());
        updatePastReservations(list);
        return list;
    }

    @Transactional
    public Reservation findById(Long id) {
        if (id == null)
            return null;
        Reservation res = reservationRepository.findById(id).orElse(null);
        if (res != null) {
            // Force le chargement de toutes les relations LAZY pour le reçu
            try {
                if (res.getChambre() != null) {
                    res.getChambre().getType();
                    if (res.getChambre().getHotel() != null) {
                        // Hotel n'a pas de getNom() — le nom est sur Utilisateur
                        if (res.getChambre().getHotel().getUtilisateur() != null)
                            res.getChambre().getHotel().getUtilisateur().getNom();
                    }
                }
                if (res.getTableResto() != null) {
                    res.getTableResto().getNumero();
                    if (res.getTableResto().getRestaurant() != null) {
                        // Restaurant n'a pas de getNom() — le nom est sur Utilisateur
                        if (res.getTableResto().getRestaurant().getUtilisateur() != null)
                            res.getTableResto().getRestaurant().getUtilisateur().getNom();
                    }
                }
                if (res.getFilm() != null) res.getFilm().getTitre();
                if (res.getEvenement() != null) res.getEvenement().getTitre();
                if (res.getSortie() != null) res.getSortie().getTitre();
                if (res.getSport() != null) res.getSport().getNomActivite();
                if (res.getMaterielSport() != null) res.getMaterielSport().getNom();
            } catch (Exception e) {
                System.err.println("⚠️ findById - Relation lazy non chargée: " + e.getMessage());
            }
        }
        return res;
    }

    public Reservation save(Reservation entity) {
        if (entity == null)
            return null;
        return reservationRepository.save(entity);
    }

    public void deleteById(Long id) {
        if (id == null)
            return;
        reservationRepository.deleteById(id);
    }

    private void updatePastReservations(List<Reservation> list) {
        LocalDateTime now = LocalDateTime.now();
        for (Reservation r : list) {
            if (r.getStatut() == Statut.ANNULEE)
                continue;

            Statut newStatut = r.getStatut();
            LocalDateTime start = r.getDateDebut();
            LocalDateTime end = r.getDateFin();

            if (start != null) {
                if (end == null) {
                    end = start.plusHours(2);
                }

                if (now.isBefore(start)) {
                    if (r.getStatut() != Statut.EN_ATTENTE)
                        newStatut = Statut.CONFIRMEE;
                } else if (now.isBefore(end) || now.isEqual(start)) {
                    newStatut = Statut.EN_COURS;
                } else {
                    newStatut = Statut.PASSEE;
                }
            }

            if (newStatut != r.getStatut()) {
                r.setStatut(newStatut);
                try {
                    reservationRepository.save(r);
                } catch (Exception e) {
                    System.err.println("⚠️ Impossible de mettre à jour le statut de la réservation #" + r.getId() + ": " + e.getMessage());
                }
            }
        }
    }

    public List<Reservation> findAllCancelled() {
        return reservationRepository.findAll().stream()
                .filter(r -> r.getStatut() == Statut.ANNULEE)
                .sorted((a, b) -> Long.compare(b.getId(), a.getId()))
                .toList();
    }

    @Transactional
    public List<Reservation> findCurrentUserReservations() {
        try {
            Utilisateur current = getCurrentUser();
            List<Reservation> list = reservationRepository.findByUtilisateurEmailOrderByIdDesc(current.getEmail());
            System.out.println("🔍 Diagnostic : " + list.size() + " réservations trouvées pour l'email " + current.getEmail());
            
            // 🔹 Sync pending Stripe payments
            for (Reservation res : list) {
                if (res.getStatutPaiement() == StatutPaiement.EN_ATTENTE && res.getStripeSessionId() != null) {
                    try {
                        stripePaymentService.verifySession(res.getStripeSessionId());
                    } catch (Exception e) {
                        System.err.println("⚠️ Sync failed for session " + res.getStripeSessionId());
                    }
                }
            }
            
            // 🔹 On filtre les réservations corrompues
            return list.stream().filter(res -> {
                try {
                    if (res.getSortie() != null) res.getSortie().getTitre();
                    if (res.getFilm() != null) res.getFilm().getTitre();
                    if (res.getEvenement() != null) res.getEvenement().getTitre();
                    if (res.getChambre() != null) {
                        res.getChambre().getNumero();
                        if (res.getChambre().getHotel() != null && res.getChambre().getHotel().getUtilisateur() != null) {
                            res.getChambre().getHotel().getUtilisateur().getNom();
                        }
                    }
                    if (res.getTableResto() != null) {
                        res.getTableResto().getNumero();
                        if (res.getTableResto().getRestaurant() != null && res.getTableResto().getRestaurant().getUtilisateur() != null) {
                            res.getTableResto().getRestaurant().getUtilisateur().getNom();
                        }
                    }
                    if (res.getSport() != null) res.getSport().getNomActivite();
                    if (res.getMaterielSport() != null) res.getMaterielSport().getNom();
                    return true;
                } catch (Exception e) {
                    System.err.println("❌ Réservation ID " + res.getId() + " CACHÉE car donnée orpheline : " + e.getMessage());
                    return false;
                }
            }).toList();
            
        } catch (Exception e) {
            System.err.println("🔥 Erreur globale lors du chargement des réservations: " + e.getMessage());
            return java.util.Collections.emptyList();
        }
    }

    @Transactional
    public Reservation cancelReservation(Long id) {
        if (id == null)
            throw new RuntimeException("ID de réservation manquant");
        Reservation res = reservationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Réservation introuvable"));

        Utilisateur current = getCurrentUser();
        boolean isOwner = res.getUtilisateur().getId().equals(current.getId());
        boolean isClientByEmail = res.getClientEmail() != null && res.getClientEmail().equalsIgnoreCase(current.getEmail());

        if (!isOwner && !isClientByEmail) {
            throw new RuntimeException("Vous n'êtes pas autorisé à annuler cette réservation.");
        }

        if (res.getStatut() != Statut.CONFIRMEE && res.getStatut() != Statut.EN_ATTENTE) {
            throw new RuntimeException("Seulement une réservation confirmée ou en attente peut être annulée.");
        }

        LocalDateTime now = LocalDateTime.now();
        if (res.getDateDebut().isBefore(now)) {
            throw new RuntimeException("Impossible d'annuler une réservation déjà passée.");
        }

        long hoursBefore = ChronoUnit.HOURS.between(now, res.getDateDebut());
        java.math.BigDecimal total = res.getPrixTotal() != null ? res.getPrixTotal() : java.math.BigDecimal.ZERO;

        java.math.BigDecimal refund = java.math.BigDecimal.ZERO;
        java.math.BigDecimal adminComm = java.math.BigDecimal.ZERO;
        java.math.BigDecimal providerGain = java.math.BigDecimal.ZERO;

        if (res.getStatutPaiement() != StatutPaiement.PAYE) {
            refund = java.math.BigDecimal.ZERO;
            adminComm = java.math.BigDecimal.ZERO;
            providerGain = java.math.BigDecimal.ZERO;
        } else if (hoursBefore >= 48) {
            refund = total;
            adminComm = java.math.BigDecimal.ZERO;
            providerGain = java.math.BigDecimal.ZERO;
        } else if (hoursBefore >= 24) {
            refund = priceService.multiply(total, 0.5);
            adminComm = priceService.multiply(total, 0.1);
            providerGain = total.subtract(refund).subtract(adminComm);
        } else {
            refund = java.math.BigDecimal.ZERO;
            adminComm = priceService.multiply(total, 0.1);
            providerGain = total.subtract(adminComm);
        }

        res.setStatut(Statut.ANNULEE);
        res.setMontantRembourse(refund);
        res.setCommissionAdmin(adminComm);
        res.setGainPrestataire(providerGain);

        // Si c'est un film ou événement, on peut rendre la place
        if (res.getFilm() != null) {
            res.getFilm().setPlacesDisponibles(res.getFilm().getPlacesDisponibles() + res.getNombrePersonnes());
        }
        if (res.getEvenement() != null) {
            res.getEvenement()
                    .setPlacesDisponibles(res.getEvenement().getPlacesDisponibles() + res.getNombrePersonnes());
        }

        Reservation saved = reservationRepository.save(res);
        notifyProvider(saved, "ANNULÉE");
        notificationService.notifyAdmin("❌ Réservation ANNULÉE par le client : " + saved.getServiceReserve() + " (Remboursement: " + saved.getMontantRembourse() + " DT)");
        return saved;
    }

    @Transactional
    public ReservationResponse createReservationOffline(OfflineReservationRequest req) {
        Utilisateur prestataire = getCurrentUser();

        Reservation res = new Reservation();
        res.setUtilisateur(prestataire);
        res.setTypeReservation(TypeReservation.SUR_PLACE);
        res.setStatut(Statut.CONFIRMEE);
        res.setStatutPaiement(StatutPaiement.PAYE);

        // Données client
        res.setClientNom(req.getClientNom());
        res.setClientPrenom(req.getClientPrenom());
        res.setClientTelephone(req.getClientTelephone());
        res.setClientEmail(req.getClientEmail());

        if (req.getListeCompagnons() != null) {
            res.setListeCompagnons(req.getListeCompagnons());
        }
        if (req.getNombreAdultes() != null) {
            res.setNombreAdultes(req.getNombreAdultes());
        }
        if (req.getNombreEnfants() != null) {
            res.setNombreEnfants(req.getNombreEnfants());
        }

        // Service et Quantités
        res.setServiceReserve(req.getServiceReserve());
        res.setNombrePersonnes(req.getNombrePersonnes() != null ? req.getNombrePersonnes() : 1);
        if (req.getNombreChambres() != null)
            res.setNombreChambres(req.getNombreChambres());
        if (req.getNombreMateriel() != null)
            res.setNombreMateriel(req.getNombreMateriel());
        if (req.getNombreHeures() != null)
            res.setNombreHeures(req.getNombreHeures());
        if (req.getTypeLogement() != null)
            res.setTypeLogement(req.getTypeLogement());

        java.math.BigDecimal totalGlobal = java.math.BigDecimal.ZERO;

        // Association avec le service spécifique et calcul du prix total + gestion
        // disponibilité
        if (req.getChambreId() != null) {
            long chambreId = req.getChambreId();
            Chambre chambre = chambreRepository.findById(chambreId)
                    .orElseThrow(() -> new RuntimeException("Chambre non trouvée"));
            res.setChambre(chambre);
            Hotel hotel = chambre.getHotel();
            res.setHotelId(hotel.getId());

            res.setDateDebut(req.getDateDebut());
            res.setDateFin(req.getDateFin());

            // 🔹 Vérification disponibilité (Offline)
            Integer filterSimples = req.getNbLitsSimples() != null && req.getNbLitsSimples() > 0 ? req.getNbLitsSimples() : null;
            Integer filterDoubles = req.getNbLitsDoubles() != null && req.getNbLitsDoubles() > 0 ? req.getNbLitsDoubles() : null;
            int requestedCount = req.getNombreChambres() != null ? req.getNombreChambres() : 1;

            String availError = checkRoomsAvailability(
                    hotel.getId(),
                    req.getDateDebut(),
                    req.getDateFin(),
                    chambre.getType(),
                    requestedCount,
                    filterSimples,
                    filterDoubles,
                    req.getListeProduitsChoisis());

            if (availError != null) {
                throw new RuntimeException(availError);
            }

            List<Chambre> primaryAvailable = chambreRepository.findAvailableChambres(
                    hotel.getId(),
                    chambre.getType(),
                    req.getDateDebut(),
                    req.getDateFin(),
                    filterSimples,
                    filterDoubles);
            if (primaryAvailable.isEmpty()) {
                primaryAvailable = chambreRepository.findAvailableChambres(
                        hotel.getId(),
                        chambre.getType(),
                        req.getDateDebut(),
                        req.getDateFin(),
                        null,
                        null);
            }
            res.setChambre(primaryAvailable.get(0)); // Chambre de référence

            long jours = ChronoUnit.DAYS.between(req.getDateDebut(), req.getDateFin());
            if (jours <= 0)
                jours = 1;

            java.math.BigDecimal prixChambrePart = (chambre.getPrix() != null ? chambre.getPrix()
                    : java.math.BigDecimal.ZERO)
                    .multiply(java.math.BigDecimal.valueOf(jours))
                    .multiply(java.math.BigDecimal
                            .valueOf(req.getNombreChambres() != null ? req.getNombreChambres() : 1));
            java.math.BigDecimal prixLogementPart = java.math.BigDecimal.ZERO;
            if (req.getTypeLogement() != null && !req.getTypeLogement().isEmpty()) {
                prixLogementPart = getPrixFormule(hotel, req.getTypeLogement())
                        .multiply(java.math.BigDecimal.valueOf(jours));
            }
            
            if (req.getPrixTotal() != null && req.getPrixTotal().compareTo(java.math.BigDecimal.ZERO) > 0) {
                totalGlobal = req.getPrixTotal();
            } else {
                totalGlobal = prixChambrePart.add(prixLogementPart);
            }
            
            res.setNbLitsSimples(req.getNbLitsSimples());
            res.setNbLitsDoubles(req.getNbLitsDoubles());
            // Sauvegarder le mode de réservation (offline)
            if (req.getModeReservation() != null) res.setModeReservation(req.getModeReservation());
            if (req.getListeProduitsChoisis() != null) res.setListeProduitsChoisis(req.getListeProduitsChoisis());

        } else if ((req.getTableIds() != null && !req.getTableIds().isEmpty()) || req.getTableRestoId() != null || "A_EMPORTER".equals(req.getModeConsommation()) || req.getRestaurantId() != null) {
            
            res.setModeConsommation(req.getModeConsommation() != null ? req.getModeConsommation() : "SUR_PLACE");
            
            java.util.List<Long> tIds = new java.util.ArrayList<>();
            if ("SUR_PLACE".equals(res.getModeConsommation())) {
                if (req.getTableIds() != null && !req.getTableIds().isEmpty()) {
                    tIds.addAll(req.getTableIds());
                } else if (req.getTableRestoId() != null) {
                    tIds.add(req.getTableRestoId());
                }
            }
            
            int duration = req.getNombreHeures() != null ? req.getNombreHeures() : 1;
            LocalDateTime dateFinResto = req.getDateDebut().plusHours(duration);
            res.setDateDebut(req.getDateDebut());
            res.setDateFin(dateFinResto);
            
            BigDecimal prixLocation = BigDecimal.ZERO;
            BigDecimal minBudgetGlobal = BigDecimal.ZERO;
            
            Restaurant restaurant = null;
            if (req.getRestaurantId() != null) {
                restaurant = restaurantRepository.findById(req.getRestaurantId()).orElse(null);
            }

            for (Long tId : tIds) {
                TableResto table = tableRestoRepository.findById(tId)
                        .orElseThrow(() -> new RuntimeException("Table introuvable"));
                
                if (restaurant == null) {
                    restaurant = table.getRestaurant();
                }

                // 🔹 Vérification disponibilité (Offline Table)
                Long alreadyReserved = reservationRepository.countReservedTable(table.getId(), req.getDateDebut(), dateFinResto);
                if (alreadyReserved > 0) {
                    throw new RuntimeException("La table " + table.getNumero() + " est déjà réservée sur ce créneau.");
                }

                // Set la table principale pour compatibilité avec l'existant
                if (res.getTableResto() == null) res.setTableResto(table);

                double units = (double) duration / (table.getUniteHeures() != null ? table.getUniteHeures() : 1);
                
                BigDecimal basePrice = table.getPrix() != null ? table.getPrix() : BigDecimal.ZERO;
                prixLocation = prixLocation.add(basePrice.multiply(BigDecimal.valueOf(units)));
                
                BigDecimal minBudget = table.getBudgetMinimal() != null ? table.getBudgetMinimal() : BigDecimal.ZERO;
                minBudgetGlobal = minBudgetGlobal.add(minBudget.multiply(BigDecimal.valueOf(units)));
            }

            if (restaurant != null) {
                if (!isWithinWorkingHours(req.getDateDebut(), restaurant.getJoursOuverture(),
                        restaurant.getHeureOuverture(), restaurant.getHeureFermeture())) {
                    throw new RuntimeException("Le restaurant est fermé à cette heure/date.");
                }
                res.setRestaurant(restaurant);
            }



            // Gestion des menus
            BigDecimal prixMenus = BigDecimal.ZERO;
            if (req.getMenusChoisis() != null && !req.getMenusChoisis().isEmpty()) {
                java.util.List<Reservation.MenuProductDTO> menuProductsList = new java.util.ArrayList<>();
                boolean isFirstMenu = true;
                for (MenuSelectionDTO ms : req.getMenusChoisis()) {
                    Menu menu = menuRepository.findById(ms.getMenuId())
                            .orElseThrow(() -> new RuntimeException("Menu introuvable"));
                    if (menu.getQuantiteDisponible() < ms.getQuantite()) {
                        throw new RuntimeException("Quantité insuffisante pour le menu : " + menu.getNom());
                    }
                    menu.setQuantiteDisponible(menu.getQuantiteDisponible() - ms.getQuantite());
                    menuRepository.save(menu);

                    menuProductsList.add(new Reservation.MenuProductDTO(menu, ms.getQuantite(), menu.getPrix()));

                    if (isFirstMenu) {
                        res.setMenu(menu);
                        res.setQuantite(ms.getQuantite());
                        res.setPrixUnitaire(menu.getPrix());
                        isFirstMenu = false;
                    }

                    prixMenus = prixMenus.add(menu.getPrix().multiply(BigDecimal.valueOf(ms.getQuantite())));
                }
                try {
                    com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                    res.setListeProduitsChoisis(mapper.writeValueAsString(menuProductsList));
                } catch (Exception e) {
                    throw new RuntimeException("Erreur de sérialisation des menus", e);
                }
            }
            res.setTotalMenu(prixMenus);

            // Calcul final : Location + Max(Menus, Budget Minimal)
            totalGlobal = prixLocation.add(prixMenus.max(minBudgetGlobal));
        } else if (req.getFilmId() != null) {
            long filmId = req.getFilmId();
            Film film = filmRepository.findById(filmId).orElseThrow(() -> new RuntimeException("Film non trouvé"));
            res.setFilm(film);
            res.setDateDebut(film.getDateProjection()); // Récupération auto de la date
            totalGlobal = (film.getPrix() != null ? film.getPrix() : java.math.BigDecimal.ZERO)
                    .multiply(java.math.BigDecimal.valueOf(res.getNombrePersonnes()));
            if (film.getPlacesDisponibles() < res.getNombrePersonnes())
                throw new RuntimeException("Complet (Places insuffisantes)");
            film.setPlacesDisponibles(film.getPlacesDisponibles() - res.getNombrePersonnes());
            filmRepository.save(film);
        } else if (req.getEvenementId() != null) {
            long eventId = req.getEvenementId();
            Evenement ev = evenementRepository.findById(eventId)
                    .orElseThrow(() -> new RuntimeException("Événement non trouvé"));
            res.setEvenement(ev);
            res.setDateDebut(ev.getDateDebut()); // Récupération auto de la date
            res.setDateFin(ev.getDateFin());
            totalGlobal = (ev.getPrix() != null ? ev.getPrix() : java.math.BigDecimal.ZERO)
                    .multiply(java.math.BigDecimal.valueOf(res.getNombrePersonnes()));
            if (ev.getPlacesDisponibles() < res.getNombrePersonnes())
                throw new RuntimeException("Complet (Places insuffisantes)");
            ev.setPlacesDisponibles(ev.getPlacesDisponibles() - res.getNombrePersonnes());
            evenementRepository.save(ev);
        } else if (req.getMaterielSportId() != null) {
            long matId = req.getMaterielSportId();
            MaterielSport mat = materielSportRepository.findById(matId)
                    .orElseThrow(() -> new RuntimeException("Matériel non trouvé"));
            if (!isWithinWorkingHours(req.getDateDebut(), mat.getSport().getJoursOuverture(),
                    mat.getSport().getHeureOuverture(), mat.getSport().getHeureFermeture())) {
                throw new RuntimeException("Le centre sportif est fermé à cette heure/date.");
            }
            res.setMaterielSport(mat);
            res.setSport(mat.getSport());
            res.setDateDebut(req.getDateDebut());
            int hrs = req.getNombreHeures() != null ? req.getNombreHeures() : 1;
            int qteMat = req.getNombreMateriel() != null ? req.getNombreMateriel() : 1;

            LocalDateTime dateFin;
            if (req.getNombreMinutes() != null) {
                dateFin = req.getDateDebut().plusMinutes(req.getNombreMinutes());
                java.math.BigDecimal baseRate = mat.getPrixParHeure() != null ? mat.getPrixParHeure()
                        : java.math.BigDecimal.ZERO;
                java.math.BigDecimal durationFact = java.math.BigDecimal.valueOf(req.getNombreMinutes())
                        .divide(java.math.BigDecimal.valueOf(60), 4, java.math.RoundingMode.HALF_UP);
                totalGlobal = baseRate.multiply(durationFact).multiply(java.math.BigDecimal.valueOf(qteMat));
                res.setNombreHeures(req.getNombreMinutes() / 60 > 0 ? req.getNombreMinutes() / 60 : 1);
                res.setTypeLogement(req.getNombreMinutes() + " minutes - "
                        + (req.getNombrePersonnes() != null ? req.getNombrePersonnes() : 1) + " personnes");
            } else {
                dateFin = req.getDateDebut().plusHours(hrs);
                totalGlobal = (mat.getPrixParHeure() != null ? mat.getPrixParHeure() : java.math.BigDecimal.ZERO)
                        .multiply(java.math.BigDecimal.valueOf(hrs))
                        .multiply(java.math.BigDecimal.valueOf(qteMat));
                res.setNombreHeures(hrs);
            }
            res.setDateFin(dateFin);

            Integer used = reservationRepository.sumReservedSpecificMaterialOverlapping(mat.getId(), req.getDateDebut(),
                    dateFin);
            if (used == null)
                used = 0;
            int maxDispo = mat.getQuantite() != null ? mat.getQuantite() : 0;
            if (used + qteMat > maxDispo)
                throw new RuntimeException("Quantité d'équipement insuffisante pour ce créneau (Déjà " + used
                        + " réservé(s) sur " + maxDispo + ")");
            
            // 🔹 NOUVEAU: Vérifier que la réservation ne finit pas après la fermeture
            if (!isWithinWorkingHours(dateFin, mat.getSport().getJoursOuverture(),
                    mat.getSport().getHeureOuverture(), mat.getSport().getHeureFermeture())) {
                throw new RuntimeException("La séance se termine après l'heure de fermeture du centre.");
            }
        } else if (req.getSortieId() != null) {
            long sortieId = req.getSortieId();
            Sortie sortie = sortieRepository.findById(sortieId)
                    .orElseThrow(() -> new RuntimeException("Sortie non trouvée"));
            if (!isWithinWorkingHours(sortie.getDateSortie(), sortie.getGuide().getJoursOuverture(),
                    sortie.getGuide().getHeureOuverture(), sortie.getGuide().getHeureFermeture())) {
                throw new RuntimeException("Le guide ne travaille pas à cette heure/date.");
            }
            res.setSortie(sortie);
            res.setDateDebut(sortie.getDateSortie()); // Récupération auto de la date
            totalGlobal = (sortie.getPrix() != null ? sortie.getPrix() : java.math.BigDecimal.ZERO)
                    .multiply(java.math.BigDecimal.valueOf(res.getNombrePersonnes()));
            Integer booked = reservationRepository.sumReservedPlacesForSortie(sortie.getId(), res.getDateDebut());
            if (booked == null)
                booked = 0;
            if (booked + res.getNombrePersonnes() > sortie.getPlacesDisponibles())
                throw new RuntimeException("Plus de places disponibles pour ce circuit");
        }

        // Note: Le traitement des menus pour les réservations offline est maintenant géré
        // directement dans le bloc restaurant ci-dessus pour éviter les duplications et doubles décomptes.

        res.setPrixTotal(totalGlobal);
        res.setTotalGlobal(totalGlobal); // Synchronisation des deux champs
        // Gains spécifiques OFFLINE (Pas de commission admin)
        res.setCommissionAdmin(java.math.BigDecimal.ZERO);
        res.setGainPrestataire(totalGlobal);

        // 🔹 Validation finale des dates (après récupération auto pour
        // Event/Film/Sortie)
        validateDates(res.getDateDebut(), res.getDateFin());

        reservationRepository.save(res);
        String provNom = extractNom(prestataire);
        notificationService.notifyAdmin("🗓️ Nouvelle réservation OFFLINE : " + res.getServiceReserve() + " par le prestataire " + provNom + " (Client: " + res.getClientNom() + ")");
        return new ReservationResponse(true, "Réservation OFFLINE créée avec succès", totalGlobal, res.getId());
    }

    @Transactional
    public Reservation cancelReservationOffline(Long id) {
        if (id == null)
            throw new RuntimeException("ID de réservation manquant");
        Reservation res = reservationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Réservation introuvable"));

        Utilisateur prestataire = getCurrentUser();
        if (!res.getUtilisateur().getId().equals(prestataire.getId())) {
            throw new RuntimeException("Non autorisé à annuler cette réservation.");
        }

        if (res.getStatut() != Statut.CONFIRMEE) {
            throw new RuntimeException("Seule une réservation confirmée peut être annulée.");
        }

        LocalDateTime now = LocalDateTime.now();
        if (res.getDateDebut() != null && res.getDateDebut().isBefore(now)) {
            throw new RuntimeException("Impossible d'annuler une réservation passée.");
        }

        long hoursBefore = 0;
        if (res.getDateDebut() != null) {
            hoursBefore = ChronoUnit.HOURS.between(now, res.getDateDebut());
        } else {
            hoursBefore = 48; // Si pas de date de début précise, remboursement total
        }

        java.math.BigDecimal total = res.getPrixTotal() != null ? res.getPrixTotal() : java.math.BigDecimal.ZERO;

        java.math.BigDecimal refund = java.math.BigDecimal.ZERO;
        java.math.BigDecimal providerGain = java.math.BigDecimal.ZERO;

        // Logique sans commission admin
        if (hoursBefore >= 48) {
            refund = total; // 100% au client
            providerGain = java.math.BigDecimal.ZERO;
        } else if (hoursBefore >= 24) {
            refund = priceService.multiply(total, 0.5); // 50% au client
            providerGain = priceService.multiply(total, 0.5); // 50% au prestataire
        } else {
            refund = java.math.BigDecimal.ZERO; // 0% au client
            providerGain = total; // 100% au prestataire
        }

        res.setStatut(Statut.ANNULEE);
        res.setMontantRembourse(refund);
        res.setCommissionAdmin(java.math.BigDecimal.ZERO); // 0 commission admin
        res.setGainPrestataire(providerGain);

        // Rendre les places (films, événements)
        if (res.getFilm() != null) {
            res.getFilm().setPlacesDisponibles(res.getFilm().getPlacesDisponibles() + res.getNombrePersonnes());
        }
        if (res.getEvenement() != null) {
            res.getEvenement()
                    .setPlacesDisponibles(res.getEvenement().getPlacesDisponibles() + res.getNombrePersonnes());
        }

        return reservationRepository.save(res);
    }

    public List<Reservation> findOfflineByPrestataire(String email) {
        List<Reservation> list = reservationRepository.findByUtilisateurEmailAndTypeReservation(email,
                TypeReservation.SUR_PLACE);
        updatePastReservations(list);
        return list;
    }

    @Transactional
    public Reservation updateReservationDetails(Long id, ReservationDetailsRequest req) {
        if (id == null)
            throw new RuntimeException("ID de réservation manquant");
        Reservation res = reservationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Réservation introuvable."));

        Utilisateur currentUser = getCurrentUser();

        // Sécurité
        if (res.getTypeReservation() == TypeReservation.EN_LIGNE) {
            // Seul le touriste peut modifier sa résa (il est le 'utilisateur' lié à la
            // résa)
            if (!res.getUtilisateur().getId().equals(currentUser.getId())) {
                throw new RuntimeException("Vous n'êtes pas autorisé à modifier cette réservation.");
            }
            // En ONLINE, les infos sont aussi liées au profil Utilisateur, on les met
            // plutôt ici
            res.setClientNom(req.getNom());
            res.setClientPrenom(req.getPrenom());
            res.setClientTelephone(req.getTelephone());
            res.setClientAdresse(req.getAdresse());
        } else {
            // OFFLINE : le prestataire est l'owner dans le mapping utilisateur
            if (!res.getUtilisateur().getId().equals(currentUser.getId())) {
                throw new RuntimeException("Vous n'êtes pas autorisé à modifier cette réservation.");
            }
            res.setClientNom(req.getNom());
            res.setClientPrenom(req.getPrenom());
            res.setClientTelephone(req.getTelephone());
            res.setClientAdresse(req.getAdresse());
        }

        // Mise à jour de la date si fournie
        if (req.getDateDebut() != null)
            res.setDateDebut(req.getDateDebut());
        if (req.getDateFin() != null)
            res.setDateFin(req.getDateFin());

        Reservation saved = reservationRepository.save(res);
        notifyProvider(saved, "MODIFIÉE");
        notificationService.notifyAdmin("✏️ Réservation MODIFIÉE : " + saved.getServiceReserve() + " (Client: " + saved.getClientNom() + ")");
        return saved;
    }

    private void validateDates(LocalDateTime start, LocalDateTime end) {
        if (start == null)
            return;
        LocalDateTime now = LocalDateTime.now();

        // Allow same-day bookings: compare only the date part
        if (start.toLocalDate().isBefore(now.toLocalDate())) {
            throw new RuntimeException("Vous ne pouvez pas réserver pour une date passée.");
        }

        if (end != null && start.isAfter(end)) {
            throw new RuntimeException("La date de début ne peut pas être après la date de fin.");
        }
    }

    private void validateStrictDateTime(LocalDateTime start) {
        if (start == null) return;
        if (start.isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Vous ne pouvez pas réserver pour une date et heure déjà passées.");
        }
    }

    @Transactional
    public void cancelExpiredPendingReservations() {
        // Force IDE rebuild trigger
        try {
            LocalDateTime limit = LocalDateTime.now().minusMinutes(15);
            List<Reservation> pending = reservationRepository.findAll().stream()
                    .filter(r -> r.getStatut() == Statut.EN_ATTENTE && r.getDateCreation() != null && r.getDateCreation().isBefore(limit))
                    .toList();
            for (Reservation r : pending) {
                r.setStatut(Statut.ANNULEE);
                r.setStatutPaiement(StatutPaiement.ECHOUE);
                reservationRepository.save(r);
                System.out.println("⏰ Annulation automatique de la réservation en attente expirée ID: " + r.getId());
            }
        } catch (Exception e) {
            System.err.println("⚠️ Erreur lors du nettoyage des réservations expirées: " + e.getMessage());
        }
    }

    @Transactional
    public ReservationResponse reserverHotel(HotelReservationRequest req) {
        cancelExpiredPendingReservations();
        if (req.getDateDebut() == null || req.getDateFin() == null)
            return new ReservationResponse(false, "Veuillez sélectionner les dates", java.math.BigDecimal.ZERO);

        validateDates(req.getDateDebut(), req.getDateFin());

        if (req.getHotelId() == null) throw new RuntimeException("ID hôtel manquant");
        Hotel hCheck = hotelRepository.findById(req.getHotelId())
                .orElseThrow(() -> new RuntimeException("Hôtel non trouvé"));
        if (hCheck.getUtilisateur() != null && hCheck.getUtilisateur().getEstBloque() != null && hCheck.getUtilisateur().getEstBloque()) {
            throw new RuntimeException("Cet hôtel est actuellement indisponible (compte suspendu).");
        }

        Integer filterSimples = req.getNbLitsSimples() != null && req.getNbLitsSimples() > 0 ? req.getNbLitsSimples() : null;
        Integer filterDoubles = req.getNbLitsDoubles() != null && req.getNbLitsDoubles() > 0 ? req.getNbLitsDoubles() : null;

        String availError = checkRoomsAvailability(
                req.getHotelId(),
                req.getDateDebut(),
                req.getDateFin(),
                req.getTypeChambre(),
                req.getNombreChambres(),
                filterSimples,
                filterDoubles,
                req.getListeProduitsChoisis());

        if (availError != null) {
            return new ReservationResponse(false, availError, java.math.BigDecimal.ZERO);
        }

        List<Chambre> primaryAvailable = chambreRepository.findAvailableChambres(
                req.getHotelId(),
                req.getTypeChambre(),
                req.getDateDebut(),
                req.getDateFin(),
                filterSimples,
                filterDoubles);
        if (primaryAvailable.isEmpty()) {
            primaryAvailable = chambreRepository.findAvailableChambres(
                    req.getHotelId(),
                    req.getTypeChambre(),
                    req.getDateDebut(),
                    req.getDateFin(),
                    null,
                    null);
        }
        Chambre ch = primaryAvailable.get(0);
        Utilisateur user = getCurrentUser();
        long jours = ChronoUnit.DAYS.between(req.getDateDebut(), req.getDateFin());
        if (jours <= 0)
            jours = 1;

        java.math.BigDecimal prixChambrePart = (ch.getPrix() != null ? ch.getPrix() : java.math.BigDecimal.ZERO)
                .multiply(java.math.BigDecimal.valueOf(jours))
                .multiply(java.math.BigDecimal.valueOf(req.getNombreChambres()));
        java.math.BigDecimal prixLogementPart = java.math.BigDecimal.ZERO;

        if (req.getTypeLogement() != null && !req.getTypeLogement().isEmpty()) {
            if (req.getHotelId() != null) {
                long hotelId = req.getHotelId();
                Hotel hotelEntity = hotelRepository.findById(hotelId).orElse(null);
                if (hotelEntity != null) {
                    prixLogementPart = getPrixFormule(hotelEntity, req.getTypeLogement())
                            .multiply(java.math.BigDecimal.valueOf(jours));
                }
            }
        }

        java.math.BigDecimal totalGlobal = prixChambrePart.add(prixLogementPart);

        // Utiliser le prix calculé par le frontend s'il est fourni (inclut les
        // suppléments adultes/enfants)
        // Sinon, fallback sur le calcul backend (sans suppléments)
        java.math.BigDecimal prixFinal = (req.getPrixCalcule() != null
                && req.getPrixCalcule().compareTo(java.math.BigDecimal.ZERO) > 0)
                        ? req.getPrixCalcule()
                        : totalGlobal;

        Reservation res = new Reservation();
        res.setUtilisateur(user);
        res.setChambre(ch);
        res.setHotelId(ch.getHotel().getId()); // Association directe à l'hôtel
        res.setStatut(Statut.CONFIRMEE);
        res.setDateDebut(req.getDateDebut());
        res.setDateFin(req.getDateFin());
        res.setNombreChambres(req.getNombreChambres());
        res.setNombrePersonnes(
                ch.getCapacite() != null ? ch.getCapacite() * req.getNombreChambres() : req.getNombreChambres());
        res.setPrixTotal(prixFinal);
        res.setStatutPaiement(StatutPaiement.EN_ATTENTE);
        res.setStatut(Statut.EN_ATTENTE); // Attente de paiement Stripe
        res.setClientNom(req.getClientNom());
        res.setClientPrenom(req.getClientPrenom());
        res.setClientTelephone(req.getClientTelephone());
        res.setClientEmail(req.getClientEmail());
        res.setTypeLogement(req.getTypeLogement());
        res.setNbLitsSimples(req.getNbLitsSimples());
        res.setNbLitsDoubles(req.getNbLitsDoubles());

        res.setNombreAdultes(req.getNombreAdultes());
        res.setNombreEnfants(req.getNombreEnfants());
        // Sauvegarder le mode, les compagnons et le détail par chambre
        if (req.getModeReservation() != null) res.setModeReservation(req.getModeReservation());
        if (req.getListeCompagnons() != null) res.setListeCompagnons(req.getListeCompagnons());
        if (req.getListeProduitsChoisis() != null) res.setListeProduitsChoisis(req.getListeProduitsChoisis());
        String hotelName = (ch.getHotel().getUtilisateur() != null) ? ch.getHotel().getUtilisateur().getNom() : "Hôtel #" + ch.getHotel().getId();
        res.setServiceReserve("Hôtel (" + hotelName + ")");

        calculateInitialGains(res);
        // Note: La chambre principale est associée via res.setChambre(ch)
        
        Reservation saved = reservationRepository.save(res);

        // Notification centralisée pour le prestataire
        notifyProvider(saved, "CRÉÉE");
        notificationService.notifyAdmin("🏨 Nouvelle réservation Hôtel : " + hotelName + " par " + user.getNom() + " (" + saved.getPrixTotal() + " DT)");

        return new ReservationResponse(true, "Hôtel réservé", prixFinal, saved.getId());
    }

    public ReservationResponse previewHotel(HotelReservationRequest req) {
        cancelExpiredPendingReservations();
        if (req.getDateDebut() == null || req.getDateFin() == null)
            return new ReservationResponse(false, "Veuillez sélectionner les dates", java.math.BigDecimal.ZERO);
        if (req.getDateDebut().isAfter(req.getDateFin()))
            return new ReservationResponse(false, "Dates invalides", java.math.BigDecimal.ZERO);

        Integer filterSimples = req.getNbLitsSimples() != null && req.getNbLitsSimples() > 0 ? req.getNbLitsSimples() : null;
        Integer filterDoubles = req.getNbLitsDoubles() != null && req.getNbLitsDoubles() > 0 ? req.getNbLitsDoubles() : null;

        String availError = checkRoomsAvailability(
                req.getHotelId(),
                req.getDateDebut(),
                req.getDateFin(),
                req.getTypeChambre(),
                req.getNombreChambres(),
                filterSimples,
                filterDoubles,
                req.getListeProduitsChoisis());

        if (availError != null) {
            return new ReservationResponse(false, availError, java.math.BigDecimal.ZERO);
        }

        List<Chambre> primaryAvailable = chambreRepository.findAvailableChambres(
                req.getHotelId(),
                req.getTypeChambre(),
                req.getDateDebut(),
                req.getDateFin(),
                filterSimples,
                filterDoubles);
        if (primaryAvailable.isEmpty()) {
            primaryAvailable = chambreRepository.findAvailableChambres(
                    req.getHotelId(),
                    req.getTypeChambre(),
                    req.getDateDebut(),
                    req.getDateFin(),
                    null,
                    null);
        }
        Chambre ch = primaryAvailable.get(0);
        long jours = ChronoUnit.DAYS.between(req.getDateDebut(), req.getDateFin());
        if (jours <= 0)
            jours = 1;

        java.math.BigDecimal prixChambrePart = (ch.getPrix() != null ? ch.getPrix() : java.math.BigDecimal.ZERO)
                .multiply(java.math.BigDecimal.valueOf(jours))
                .multiply(java.math.BigDecimal.valueOf(req.getNombreChambres()));
        java.math.BigDecimal prixLogementPart = java.math.BigDecimal.ZERO;

        if (req.getTypeLogement() != null && !req.getTypeLogement().isEmpty()) {
            if (req.getHotelId() != null) {
                long hotelId = req.getHotelId();
                Hotel hotelEntityPreview = hotelRepository.findById(hotelId).orElse(null);
                if (hotelEntityPreview != null) {
                    prixLogementPart = getPrixFormule(hotelEntityPreview, req.getTypeLogement())
                            .multiply(java.math.BigDecimal.valueOf(jours));
                }
            }
        }
        java.math.BigDecimal totalGlobal = prixChambrePart.add(prixLogementPart);
        return new ReservationResponse(true, "Disponible", totalGlobal);
    }

    private String checkRoomsAvailability(Long hotelId, LocalDateTime dateDebut, LocalDateTime dateFin, String defaultType, int defaultNombre, Integer defaultSimples, Integer defaultDoubles, String listeProduitsChoisis) {
        return checkRoomsAvailabilityExcluding(hotelId, dateDebut, dateFin, defaultType, defaultNombre, defaultSimples, defaultDoubles, listeProduitsChoisis, null);
    }

    private String checkRoomsAvailabilityExcluding(Long hotelId, LocalDateTime dateDebut, LocalDateTime dateFin, String defaultType, int defaultNombre, Integer defaultSimples, Integer defaultDoubles, String listeProduitsChoisis, Long excludeReservationId) {
        if (dateDebut == null || dateFin == null) {
            return "Veuillez sélectionner les dates";
        }
        if (dateDebut.isAfter(dateFin)) {
            return "La date de début ne peut pas être après la date de fin.";
        }

        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        List<java.util.Map<String, Object>> requestedRooms = null;
        if (listeProduitsChoisis != null && !listeProduitsChoisis.trim().isEmpty()) {
            try {
                requestedRooms = mapper.readValue(listeProduitsChoisis, new com.fasterxml.jackson.core.type.TypeReference<List<java.util.Map<String, Object>>>() {});
            } catch (Exception e) {
                System.err.println("⚠️ Warning: Could not parse listeProduitsChoisis: " + e.getMessage());
            }
        }

        // Si listeProduitsChoisis est vide ou invalide, on fait le fallback classique (une seule config de chambre)
        if (requestedRooms == null || requestedRooms.isEmpty()) {
            List<Chambre> available = excludeReservationId != null ?
                chambreRepository.findAvailableChambresExcluding(
                    hotelId, defaultType, dateDebut, dateFin,
                    defaultSimples != null && defaultSimples > 0 ? defaultSimples : null,
                    defaultDoubles != null && defaultDoubles > 0 ? defaultDoubles : null,
                    excludeReservationId) :
                chambreRepository.findAvailableChambres(
                    hotelId, defaultType, dateDebut, dateFin,
                    defaultSimples != null && defaultSimples > 0 ? defaultSimples : null,
                    defaultDoubles != null && defaultDoubles > 0 ? defaultDoubles : null);

            if (available.size() < defaultNombre) {
                List<Chambre> roomsWithoutBedFilter = excludeReservationId != null ?
                    chambreRepository.findAvailableChambresExcluding(
                        hotelId, defaultType, dateDebut, dateFin, null, null, excludeReservationId) :
                    chambreRepository.findAvailableChambres(
                        hotelId, defaultType, dateDebut, dateFin, null, null);
                if (roomsWithoutBedFilter.size() >= defaultNombre) {
                    boolean allBedDataMissing = roomsWithoutBedFilter.stream()
                        .allMatch(ch -> ch.getNbLitsSimples() == null && ch.getNbLitsDoubles() == null);
                    if (!allBedDataMissing) {
                        return "La configuration de lits demandée n'est pas disponible pour ce type de chambre.";
                    }
                } else {
                    return "Nombre de chambres insuffisant (" + available.size() + " dispo).";
                }
            }
            return null; // Tout est dispo
        }

        // --- ALGORITHME D'ALLOCATION GLOUTONNE MULTI-TYPE ---
        java.util.Set<String> requiredTypes = new java.util.HashSet<>();
        for (java.util.Map<String, Object> reqRoom : requestedRooms) {
            String type = (String) reqRoom.get("type");
            if (type != null) requiredTypes.add(type);
        }

        // ─────────────────────────────────────────────────────────────────────
        // CORRECTION BUG MULTI-TYPE :
        // Une réservation avec listeProduitsChoisis (DOUBLE+TRIPLE) ne sauvegarde
        // qu'UNE chambre physique (le premier type). La chambre du 2ème type n'a
        // donc aucune réservation directe et passe à travers findAvailableChambres.
        // On parse le listeProduitsChoisis de toutes les réservations chevauchantes
        // pour compter les chambres réellement réclamées par type.
        // ─────────────────────────────────────────────────────────────────────
        java.util.Map<String, Integer> alreadyClaimedByType =
                buildAllocatedRoomsByType(hotelId, dateDebut, dateFin, excludeReservationId);

        // Charger les chambres physiques disponibles (selon réservations directes)
        java.util.Map<String, List<Chambre>> availablePhysicalRoomsByType = new java.util.HashMap<>();
        for (String type : requiredTypes) {
            List<Chambre> directlyFree = excludeReservationId != null ?
                chambreRepository.findAvailableChambresExcluding(
                    hotelId, type, dateDebut, dateFin, null, null, excludeReservationId) :
                chambreRepository.findAvailableChambres(
                    hotelId, type, dateDebut, dateFin, null, null);

            List<Chambre> mutable = new java.util.ArrayList<>(directlyFree);

            // Retirer les chambres indirectement réclamées par des réservations multi-types
            // (celles qui déclarent ce type dans listeProduitsChoisis mais ont une chambre
            //  physique d'un autre type — donc non filtrées par findAvailableChambres)
            int totalClaimed = alreadyClaimedByType.getOrDefault(type, 0);
            // Chambres déjà filtrées par findAvailableChambres (réservées directement)
            long totalPhysical = chambreRepository.findByHotelIdOrderByIdDesc(hotelId).stream()
                    .filter(c -> type.equals(c.getType()) && Boolean.TRUE.equals(c.isDisponible()))
                    .count();

            int directlyClaimed = (int)(totalPhysical - mutable.size());
            int indirectlyClaimed = Math.max(0, totalClaimed - directlyClaimed);
            // Simuler la suppression des chambres indirectement réclamées
            for (int i = 0; i < indirectlyClaimed && !mutable.isEmpty(); i++) {
                mutable.remove(mutable.size() - 1);
            }

            availablePhysicalRoomsByType.put(type, mutable);
        }

        // Trier les chambres demandées par niveau d'exigence décroissant (plus de lits = priorité)
        List<java.util.Map<String, Object>> sortedRequests = new java.util.ArrayList<>(requestedRooms);
        sortedRequests.sort((r1, r2) -> {
            int beds1 = getInt(r1.get("litsSimples")) + getInt(r1.get("litsDoubles"));
            int beds2 = getInt(r2.get("litsSimples")) + getInt(r2.get("litsDoubles"));
            return Integer.compare(beds2, beds1);
        });

        // Allocation gloutonne : associer chaque chambre demandée à une chambre physique libre
        for (java.util.Map<String, Object> reqRoom : sortedRequests) {
            String type = (String) reqRoom.get("type");
            int reqSimples = getInt(reqRoom.get("litsSimples"));
            int reqDoubles = getInt(reqRoom.get("litsDoubles"));

            List<Chambre> physRooms = availablePhysicalRoomsByType.get(type);
            if (physRooms == null || physRooms.isEmpty()) {
                return "Nombre de chambres insuffisant (0 dispo pour le type " + type + ").";
            }

            Chambre matchedRoom = null;
            // 1er essai : correspondance exacte sur les lits
            for (Chambre ch : physRooms) {
                int chSimples = ch.getNbLitsSimples() != null ? ch.getNbLitsSimples() : 0;
                int chDoubles = ch.getNbLitsDoubles() != null ? ch.getNbLitsDoubles() : 0;
                if (chSimples >= reqSimples && chDoubles >= reqDoubles) {
                    matchedRoom = ch;
                    break;
                }
            }
            // 2ème essai : si aucun lit renseigné en BDD, accepter le bon type sans filtre lits
            if (matchedRoom == null) {
                boolean allBedDataMissing = physRooms.stream()
                    .allMatch(ch -> ch.getNbLitsSimples() == null && ch.getNbLitsDoubles() == null);
                if (allBedDataMissing) matchedRoom = physRooms.get(0);
            }

            if (matchedRoom == null) {
                return "La configuration de lits demandée n'est pas disponible pour ce type de chambre.";
            }
            // Retirer la chambre physique allouée pour ne pas la réutiliser
            physRooms.remove(matchedRoom);
        }

        return null; // Tout est parfaitement disponible et allouable
    }

    private int getInt(Object val) {
        if (val == null) return 0;
        if (val instanceof Number) return ((Number) val).intValue();
        try {
            return Integer.parseInt(val.toString());
        } catch (Exception e) {
            return 0;
        }
    }

    /**
     * Compte le nombre de chambres réclamées par type de chambre en analysant
     * toutes les réservations non-annulées de l'hôtel qui chevauchent la plage de dates.
     *
     * Pour chaque réservation :
     * - Si elle a un listeProduitsChoisis valide (réservation multi-type), on compte
     *   chaque entrée JSON comme 1 chambre du type déclaré (même si la chambre physique
     *   sauvegardée est d'un autre type).
     * - Sinon, on utilise chambre.type × nombreChambres comme fallback.
     *
     * Cela corrige le bug où une réservation DOUBLE+TRIPLE ne liait physiquement
     * qu'une chambre DOUBLE, laissant la TRIPLE apparaître faussement disponible.
     */
    private java.util.Map<String, Integer> buildAllocatedRoomsByType(
            Long hotelId, LocalDateTime dateDebut, LocalDateTime dateFin, Long excludeId) {

        java.util.Map<String, Integer> claimed = new java.util.HashMap<>();
        try {
            List<Reservation> overlapping = excludeId != null
                ? reservationRepository.findOverlappingByHotelIdExcluding(hotelId, dateDebut, dateFin, excludeId)
                : reservationRepository.findOverlappingByHotelId(hotelId, dateDebut, dateFin);

            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();

            for (Reservation r : overlapping) {
                boolean parsedFromJson = false;

                // Priorité : parser listeProduitsChoisis pour avoir la vraie décomposition par type
                if (r.getListeProduitsChoisis() != null && !r.getListeProduitsChoisis().trim().isEmpty()) {
                    try {
                        List<java.util.Map<String, Object>> items = mapper.readValue(
                            r.getListeProduitsChoisis(),
                            new com.fasterxml.jackson.core.type.TypeReference<List<java.util.Map<String, Object>>>() {});
                        if (items != null && !items.isEmpty()) {
                            for (java.util.Map<String, Object> item : items) {
                                String t = (String) item.get("type");
                                if (t != null) claimed.merge(t, 1, Integer::sum);
                            }
                            parsedFromJson = true;
                        }
                    } catch (Exception ignored) {
                        // JSON malformé → fallback ci-dessous
                    }
                }

                // Fallback : utiliser le type de la chambre physique × nombreChambres
                if (!parsedFromJson) {
                    try {
                        String t = r.getChambre() != null ? r.getChambre().getType() : null;
                        int n = r.getNombreChambres() != null ? r.getNombreChambres() : 1;
                        if (t != null) claimed.merge(t, n, Integer::sum);
                    } catch (Exception ignored) {}
                }
            }
        } catch (Exception e) {
            System.err.println("⚠️ buildAllocatedRoomsByType error: " + e.getMessage());
        }
        return claimed;
    }


    public java.util.List<java.util.Map<String, Object>> getDatesOccupeesHotel(Long hotelId) {
        try {
            java.util.List<Reservation> reservations = reservationRepository.findConfirmedByHotelId(hotelId);
            return reservations.stream()
                .filter(r -> r.getDateDebut() != null && r.getDateFin() != null)
                .map(r -> {
                    java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
                    m.put("dateDebut", r.getDateDebut().toLocalDate().toString());
                    m.put("dateFin", r.getDateFin().toLocalDate().toString());
                    try { m.put("typeChambre", r.getChambre() != null ? r.getChambre().getType() : ""); }
                    catch (Exception e) { m.put("typeChambre", ""); }
                    return m;
                })
                .collect(java.util.stream.Collectors.toList());
        } catch (Exception e) {
            return new java.util.ArrayList<>();
        }
    }

    /** Retourne le prix additonnel de la formule choisie, 0 si non définie. */
    private java.math.BigDecimal getPrixFormule(Hotel h, String type) {
        if (type == null)
            return java.math.BigDecimal.ZERO;
        return switch (type.toUpperCase()) {
            case "RO" -> h.getPrixRO() != null ? h.getPrixRO() : java.math.BigDecimal.ZERO;
            case "BB" -> h.getPrixBB() != null ? h.getPrixBB() : java.math.BigDecimal.ZERO;
            case "HB" -> h.getPrixHB() != null ? h.getPrixHB() : java.math.BigDecimal.ZERO;
            case "FB" -> h.getPrixFB() != null ? h.getPrixFB() : java.math.BigDecimal.ZERO;
            case "SOFT_AI" -> h.getPrixSoftAI() != null ? h.getPrixSoftAI() : java.math.BigDecimal.ZERO;
            case "ALL_INCLUSIVE" ->
                h.getPrixAllInclusive() != null ? h.getPrixAllInclusive() : java.math.BigDecimal.ZERO;
            default -> java.math.BigDecimal.ZERO;
        };
    }

    @Transactional
    public ReservationResponse reserverRestaurant(RestaurantReservationRequest req) {
        cancelExpiredPendingReservations();
        try {
            if (req.getRestaurantId() == null)
                throw new RuntimeException("ID restaurant manquant");
            long restId = req.getRestaurantId();
            Restaurant restEntity = restaurantRepository.findById(restId)
                    .orElseThrow(() -> new RuntimeException("Restaurant non trouvé"));
            if (restEntity.getUtilisateur() != null && restEntity.getUtilisateur().getEstBloque() != null && restEntity.getUtilisateur().getEstBloque()) {
                throw new RuntimeException("Ce restaurant est actuellement indisponible (compte suspendu).");
            }
            if (!isWithinWorkingHours(req.getDateHeure(), restEntity.getJoursOuverture(), restEntity.getHeureOuverture(),
                    restEntity.getHeureFermeture())) {
                return new ReservationResponse(false, "Le restaurant est fermé à cette heure/date.",
                        java.math.BigDecimal.ZERO);
            }

            int duration = req.getDureeHeures() > 0 ? req.getDureeHeures() : 1;
            LocalDateTime dateFin = req.getDateHeure().plusHours(duration);
            validateStrictDateTime(req.getDateHeure());
            validateDates(req.getDateHeure(), dateFin);

            List<TableResto> selectedTables = new java.util.ArrayList<>();

            if (req.getTableIds() != null && !req.getTableIds().isEmpty()) {
                // Sélection explicite des tables
                for (Long tid : req.getTableIds()) {
                    if (tid == null)
                        continue;
                    TableResto table = tableRestoRepository.findById(tid)
                            .orElseThrow(() -> new RuntimeException("Table introuvable"));
                    // Vérifier si elle est dispo sur tout le créneau
                    Long reservedCount = reservationRepository.countReservedTable(table.getId(), req.getDateHeure(),
                            dateFin);
                    if (reservedCount > 0)
                        throw new RuntimeException(
                                "La table " + table.getNumero() + " n'est pas disponible sur ce créneau.");
                    selectedTables.add(table);
                }
            } else {
                // Ancienne méthode : sélection automatique
                List<TableResto> dispos = tableRestoRepository.findAvailableTables(req.getRestaurantId(),
                        req.getDateHeure(), dateFin);
                if (dispos.size() < req.getNombreTables())
                    return new ReservationResponse(false, "Pas de table disponible", java.math.BigDecimal.ZERO);
                for (int i = 0; i < req.getNombreTables(); i++)
                    selectedTables.add(dispos.get(i));
            }

            // Menu processing
            BigDecimal totalMenu = BigDecimal.ZERO;
            List<djerbatourb.djerbatourb.dto.MenuSelectionDTO> menusChoisis = req.getMenusChoisis();
            List<Reservation.MenuProductDTO> menuProductsList = new java.util.ArrayList<>();
            Menu firstMenu = null;
            Integer firstQty = null;
            BigDecimal firstPrice = null;
            
            if (menusChoisis != null && !menusChoisis.isEmpty()) {
                for (djerbatourb.djerbatourb.dto.MenuSelectionDTO m : menusChoisis) {
                    Menu menuEntity = menuRepository.findById(m.getMenuId())
                            .orElseThrow(() -> new RuntimeException("Menu non trouvé: " + m.getMenuId()));
                    if (menuEntity.getQuantiteDisponible() < m.getQuantite()) {
                        throw new RuntimeException("Quantité insuffisante pour " + menuEntity.getNom());
                    }
                    menuEntity.setQuantiteDisponible(menuEntity.getQuantiteDisponible() - m.getQuantite());
                    menuRepository.save(menuEntity);
                    totalMenu = totalMenu.add(menuEntity.getPrix().multiply(BigDecimal.valueOf(m.getQuantite())));
                    
                    menuProductsList.add(new Reservation.MenuProductDTO(menuEntity, m.getQuantite(), menuEntity.getPrix()));
                    if (firstMenu == null) {
                        firstMenu = menuEntity;
                        firstQty = m.getQuantite();
                        firstPrice = menuEntity.getPrix();
                    }
                }
            }

            String menusJson = null;
            if (!menuProductsList.isEmpty()) {
                try {
                    com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                    menusJson = mapper.writeValueAsString(menuProductsList);
                } catch (Exception e) {
                    throw new RuntimeException("Erreur de sérialisation des menus", e);
                }
            }

            BigDecimal totalPrix = java.math.BigDecimal.ZERO;
            Utilisateur user = getCurrentUser();
            Long firstReservationId = null;

            if ("A_EMPORTER".equals(req.getModeConsommation())) {
                Reservation res = new Reservation();
                res.setUtilisateur(user);
                res.setRestaurant(restEntity);
                res.setRestaurantId(restEntity.getId());
                res.setDateDebut(req.getDateHeure());
                res.setModeConsommation("A_EMPORTER");
                res.setStatutPaiement(StatutPaiement.EN_ATTENTE);
                res.setStatut(Statut.EN_ATTENTE);
                res.setNombrePersonnes(req.getNombrePersonnes());
                
                res.setTotalMenu(totalMenu);
                BigDecimal finalPrice = req.getPrixTotal() != null ? req.getPrixTotal() : totalMenu;
                res.setPrixTotal(finalPrice);
                res.setTotalGlobal(finalPrice);
                totalPrix = finalPrice;

                // Capture Infos Client
                setClientInfo(res, req, user);
                String restoName = (restEntity.getUtilisateur() != null) ? restEntity.getUtilisateur().getNom() : "Restaurant #" + restEntity.getId();
                res.setServiceReserve("Restaurant - Emporter (" + restoName + ")");

                calculateInitialGains(res);
                
                if (firstMenu != null) {
                    res.setMenu(firstMenu);
                    res.setQuantite(firstQty);
                    res.setPrixUnitaire(firstPrice);
                    res.setListeProduitsChoisis(menusJson);
                }

                Reservation saved = reservationRepository.save(res);
                firstReservationId = saved.getId();
                
                notifyProvider(saved, "CRÉÉE");
                notificationService.notifyAdmin("🥡 Nouvelle commande À EMPORTER : " + restoName + " par " + user.getNom() + " (" + totalPrix + " DT)");
            } else {
                // MODE SUR PLACE (Par table)
                boolean isFirst = true;
                for (TableResto tab : selectedTables) {
                    Reservation res = new Reservation();
                    res.setUtilisateur(user);
                    res.setTableResto(tab);
                    res.setRestaurant(restEntity);
                    res.setRestaurantId(restEntity.getId());
                    res.setDateDebut(req.getDateHeure());
                    res.setDateFin(dateFin);
                    res.setModeConsommation("SUR_PLACE");

                    // Calcul du prix par table : (prix / uniteHeures) * duree
                    BigDecimal basePrice = tab.getPrix() != null ? tab.getPrix() : java.math.BigDecimal.ZERO;
                    double uniteH = (tab.getUniteHeures() != null && tab.getUniteHeures() > 0) ? tab.getUniteHeures() : 1;
                    BigDecimal pricePerTable = basePrice.multiply(java.math.BigDecimal.valueOf((double) duration / uniteH));

                    res.setNombrePersonnes(req.getNombrePersonnes() / selectedTables.size());

                    // Priorité au prix envoyé par le Front
                    BigDecimal finalPricePerTable;
                    if (req.getPrixTotal() != null) {
                        BigDecimal prixTablesSeules = req.getPrixTotal().subtract(totalMenu);
                        if (prixTablesSeules.compareTo(BigDecimal.ZERO) < 0) prixTablesSeules = BigDecimal.ZERO;
                        finalPricePerTable = prixTablesSeules.divide(BigDecimal.valueOf(selectedTables.size()), 2, java.math.RoundingMode.HALF_UP);
                    } else {
                        finalPricePerTable = pricePerTable;
                    }

                    if (isFirst) {
                        res.setTotalMenu(totalMenu);
                        BigDecimal finalWithMenu = finalPricePerTable.add(totalMenu);
                        res.setTotalGlobal(finalWithMenu);
                        res.setPrixTotal(finalWithMenu);
                        totalPrix = totalPrix.add(finalWithMenu);
                        
                        if (firstMenu != null) {
                            res.setMenu(firstMenu);
                            res.setQuantite(firstQty);
                            res.setPrixUnitaire(firstPrice);
                            res.setListeProduitsChoisis(menusJson);
                        }
                        isFirst = false;
                    } else {
                        res.setTotalGlobal(finalPricePerTable);
                        res.setPrixTotal(finalPricePerTable);
                        totalPrix = totalPrix.add(finalPricePerTable);
                    }

                    res.setStatutPaiement(StatutPaiement.EN_ATTENTE);
                    res.setStatut(Statut.EN_ATTENTE);

                    setClientInfo(res, req, user);
                    String restoName = (tab.getRestaurant().getUtilisateur() != null) ? tab.getRestaurant().getUtilisateur().getNom() : "Restaurant #" + tab.getRestaurant().getId();
                    res.setServiceReserve("Restaurant (" + restoName + ")");

                    calculateInitialGains(res);
                    Reservation saved = reservationRepository.save(res);
                    
                    if (firstReservationId == null)
                        firstReservationId = saved.getId();

                    if (selectedTables.indexOf(tab) == 0) {
                        notifyProvider(saved, "CRÉÉE");
                        notificationService.notifyAdmin("🍽️ Nouvelle réservation Restaurant : " + restoName + " par " + user.getNom() + " (" + totalPrix + " DT)");
                    }
                }
            }

            if (firstReservationId == null) {
                throw new RuntimeException("Erreur: Aucune réservation n'a pu être créée.");
            }

            return new ReservationResponse(true, "Table(s) réservée(s) avec succès", totalPrix, firstReservationId);
        } catch (Exception e) {
            return new ReservationResponse(false, e.getMessage(), java.math.BigDecimal.ZERO);
        }
    }

    @Transactional
    public ReservationResponse reserverFilm(TicketReservationRequest req) {
        cancelExpiredPendingReservations();
        if (req.getIdEvenement() == null)
            throw new RuntimeException("ID film manquant");
        long filmId = req.getIdEvenement();
        Film f = filmRepository.findById(filmId).orElseThrow(() -> new RuntimeException("Film non trouvé"));
        if (f.getCinema() != null && f.getCinema().getUtilisateur() != null && f.getCinema().getUtilisateur().getEstBloque() != null && f.getCinema().getUtilisateur().getEstBloque()) {
            throw new RuntimeException("Ce cinéma est actuellement indisponible (compte suspendu).");
        }
        if (f.getPlacesDisponibles() < req.getNombreTickets())
            return new ReservationResponse(false, "Complet", java.math.BigDecimal.ZERO);

        validateStrictDateTime(f.getDateProjection());

        java.math.BigDecimal total = (f.getPrix() != null ? f.getPrix() : java.math.BigDecimal.ZERO)
                .multiply(java.math.BigDecimal.valueOf(req.getNombreTickets()));
        Reservation res = new Reservation();
        res.setUtilisateur(getCurrentUser());
        res.setFilm(f);
        res.setNombrePersonnes(req.getNombreTickets());
        res.setDateDebut(f.getDateProjection());
        res.setStatut(Statut.EN_ATTENTE);
        res.setStatutPaiement(StatutPaiement.EN_ATTENTE);
        res.setServiceReserve("Ticket Cinéma");
        
        BigDecimal finalTotal = (req.getPrixTotal() != null) ? req.getPrixTotal() : total;
        res.setPrixTotal(finalTotal);
        res.setClientNom(req.getClientNom());
        res.setClientPrenom(req.getClientPrenom());
        res.setClientEmail(req.getClientEmail());
        res.setClientTelephone(req.getClientTelephone());

        calculateInitialGains(res);
        Reservation saved = reservationRepository.save(res);

        // Notification centralisée pour le prestataire
        notifyProvider(saved, "CRÉÉE");
        notificationService.notifyAdmin("🎬 Nouvelle réservation Cinéma : " + f.getTitre() + " par " + saved.getUtilisateur().getNom() + " (" + finalTotal + " DT)");

        return new ReservationResponse(true, "Billets ciné réservés", finalTotal, saved.getId());
    }

    @Transactional
    public ReservationResponse reserverEvenement(TicketReservationRequest req) {
        cancelExpiredPendingReservations();
        if (req.getIdEvenement() == null)
            throw new RuntimeException("ID événement manquant");
        long eventId = req.getIdEvenement();
        Evenement ev = evenementRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Événement non trouvé"));
        if (ev.getUtilisateur() != null && ev.getUtilisateur().getEstBloque() != null && ev.getUtilisateur().getEstBloque()) {
            throw new RuntimeException("Cet organisateur est actuellement suspendu.");
        }
        if (ev.getPlacesDisponibles() < req.getNombreTickets())
            return new ReservationResponse(false, "Complet", java.math.BigDecimal.ZERO);

        validateStrictDateTime(ev.getDateDebut());
        validateDates(ev.getDateDebut(), ev.getDateFin());

        Utilisateur currentUser = getCurrentUser();
        java.math.BigDecimal total = (ev.getPrix() != null ? ev.getPrix() : java.math.BigDecimal.ZERO)
                .multiply(java.math.BigDecimal.valueOf(req.getNombreTickets()));

        Reservation res = new Reservation();
        res.setUtilisateur(currentUser);
        res.setEvenement(ev);
        res.setNombrePersonnes(req.getNombreTickets());
        res.setDateDebut(ev.getDateDebut());
        res.setDateFin(ev.getDateFin());
        res.setStatut(Statut.EN_ATTENTE);
        res.setStatutPaiement(StatutPaiement.EN_ATTENTE);
        res.setServiceReserve("Ticket Événement");
        
        BigDecimal finalTotal = (req.getPrixTotal() != null) ? req.getPrixTotal() : total;
        res.setPrixTotal(finalTotal);

        // Fallback robuste si les champs sont vides
        String nom = (req.getClientNom() != null && !req.getClientNom().trim().isEmpty()) ? req.getClientNom()
                : extractNom(currentUser);
        String prenom = (req.getClientPrenom() != null && !req.getClientPrenom().trim().isEmpty())
                ? req.getClientPrenom()
                : extractPrenom(currentUser);
        String email = (req.getClientEmail() != null && !req.getClientEmail().trim().isEmpty()) ? req.getClientEmail()
                : (currentUser != null ? currentUser.getEmail() : null);
        String tel = (req.getClientTelephone() != null && !req.getClientTelephone().trim().isEmpty())
                ? req.getClientTelephone()
                : (currentUser != null ? currentUser.getTelephone() : null);

        res.setClientNom(nom);
        res.setClientPrenom(prenom);
        res.setClientEmail(email);
        res.setClientTelephone(tel);

        calculateInitialGains(res);
        Reservation saved = reservationRepository.save(res);

        // Notification centralisée pour le prestataire
        notifyProvider(saved, "CRÉÉE");
        notificationService.notifyAdmin("🎟️ Nouvelle réservation Événement : " + ev.getTitre() + " par " + saved.getUtilisateur().getNom() + " (" + finalTotal + " DT)");
        return new ReservationResponse(true, "Places événement réservées", finalTotal, saved.getId());
    }

    @Transactional
    public ReservationResponse reserverSport(SportReservationRequest req) {
        cancelExpiredPendingReservations();
        if (req.getSportId() == null)
            throw new RuntimeException("ID sport manquant");
        long sportId = req.getSportId();
        Sport s = sportRepository.findById(sportId).orElseThrow(() -> new RuntimeException("Sport non trouvé"));
        if (!isWithinWorkingHours(req.getDateSession(), s.getJoursOuverture(), s.getHeureOuverture(),
                s.getHeureFermeture())) {
            return new ReservationResponse(false, "L'etablissement est ferme a l'heure de debut choisie.",
                    java.math.BigDecimal.ZERO);
        }

        validateStrictDateTime(req.getDateSession());

        if (req.getMaterielId() == null)
            return new ReservationResponse(false, "Veuillez sélectionner un équipement.", java.math.BigDecimal.ZERO);
        if (req.getMaterielId() == null)
            throw new RuntimeException("ID matériel manquant");
        long matId = req.getMaterielId();
        MaterielSport mat = materielSportRepository.findById(matId)
                .orElseThrow(() -> new RuntimeException("Équipement introuvable"));
        if (!mat.getDisponible())
            return new ReservationResponse(false, "Cet équipement est actuellement indisponible.",
                    java.math.BigDecimal.ZERO);

        java.math.BigDecimal total;
        Reservation res = new Reservation();
        LocalDateTime dateFin;

        if (req.getNombreMinutes() != null) {
            dateFin = req.getDateSession().plusMinutes(req.getNombreMinutes());
            java.math.BigDecimal baseRate = mat.getPrixParHeure() != null ? mat.getPrixParHeure()
                    : java.math.BigDecimal.ZERO;
            java.math.BigDecimal durationFact = java.math.BigDecimal.valueOf(req.getNombreMinutes())
                    .divide(java.math.BigDecimal.valueOf(60), 4, java.math.RoundingMode.HALF_UP);
            total = baseRate.multiply(durationFact).multiply(java.math.BigDecimal.valueOf(req.getNombreMateriel()));
            res.setNombreHeures(req.getNombreMinutes() / 60 > 0 ? req.getNombreMinutes() / 60 : 1);
            res.setTypeLogement(req.getNombreMinutes() + " minutes - "
                    + (req.getNombrePersonnes() != null ? req.getNombrePersonnes() : 1) + " personnes");
        } else {
            dateFin = req.getDateSession().plusHours(req.getNombreHeures());
            total = (mat.getPrixParHeure() != null ? mat.getPrixParHeure() : java.math.BigDecimal.ZERO)
                    .multiply(java.math.BigDecimal.valueOf(req.getNombreHeures()))
                    .multiply(java.math.BigDecimal.valueOf(req.getNombreMateriel()));
            res.setNombreHeures(req.getNombreHeures());
        }

        Integer used = reservationRepository.sumReservedSpecificMaterialOverlapping(mat.getId(), req.getDateSession(),
                dateFin);
        if (used == null)
            used = 0;
        int maxDispo = mat.getQuantite() != null ? mat.getQuantite() : 0;
        if (used + req.getNombreMateriel() > maxDispo)
            return new ReservationResponse(false, "Quantité d'équipement insuffisante pour ce créneau (Déjà " + used
                    + " réservé(s) sur " + maxDispo + ")", java.math.BigDecimal.ZERO);

        // 🔹 NOUVEAU: Vérifier que la fin de séance est dans les horaires
        if (!isWithinWorkingHours(dateFin, s.getJoursOuverture(), s.getHeureOuverture(), s.getHeureFermeture())) {
            return new ReservationResponse(false, "La séance se termine après l'heure de fermeture du centre.",
                    java.math.BigDecimal.ZERO);
        }

        res.setUtilisateur(getCurrentUser());
        res.setSport(s);
        res.setMaterielSport(mat);
        res.setDateDebut(req.getDateSession());
        res.setDateFin(dateFin);
        res.setNombreMateriel(req.getNombreMateriel());
        res.setStatut(Statut.EN_ATTENTE);
        res.setStatutPaiement(StatutPaiement.EN_ATTENTE);
        res.setServiceReserve("Activité Sportive");
        
        BigDecimal finalTotal = (req.getPrixTotal() != null) ? req.getPrixTotal() : total;
        res.setPrixTotal(finalTotal);

        Utilisateur currentUser = getCurrentUser();
        String nom = (req.getClientNom() != null && !req.getClientNom().trim().isEmpty()) ? req.getClientNom()
                : extractNom(currentUser);
        String prenom = (req.getClientPrenom() != null && !req.getClientPrenom().trim().isEmpty())
                ? req.getClientPrenom()
                : extractPrenom(currentUser);
        String email = (req.getClientEmail() != null && !req.getClientEmail().trim().isEmpty()) ? req.getClientEmail()
                : currentUser.getEmail();
        String tel = (req.getClientTelephone() != null && !req.getClientTelephone().trim().isEmpty())
                ? req.getClientTelephone()
                : currentUser.getTelephone();

        res.setClientNom(nom);
        res.setClientPrenom(prenom);
        res.setClientEmail(email);
        res.setClientTelephone(tel);

        calculateInitialGains(res);
        Reservation saved = reservationRepository.save(res);

        // Notification centralisée pour le prestataire
        notifyProvider(saved, "CRÉÉE");
        notificationService.notifyAdmin("⚽ Nouvelle réservation Sport : " + s.getNomActivite() + " par " + saved.getUtilisateur().getNom() + " (" + finalTotal + " DT)");
        return new ReservationResponse(true, "Sport réservé", finalTotal, saved.getId());
    }

    public ReservationResponse previewSport(SportReservationRequest req) {
        if (req.getSportId() == null)
            throw new RuntimeException("ID sport manquant");
        long sportId = req.getSportId();
        Sport s = sportRepository.findById(sportId).orElseThrow(() -> new RuntimeException("Sport non trouvé"));
        if (!isWithinWorkingHours(req.getDateSession(), s.getJoursOuverture(), s.getHeureOuverture(),
                s.getHeureFermeture())) {
            return new ReservationResponse(false, "L'etablissement est ferme a l'heure de debut choisie.",
                    java.math.BigDecimal.ZERO);
        }

        validateStrictDateTime(req.getDateSession());

        if (req.getMaterielId() == null)
            return new ReservationResponse(false, "Veuillez sélectionner un équipement.", java.math.BigDecimal.ZERO);
        long matId = req.getMaterielId();
        MaterielSport mat = materielSportRepository.findById(matId)
                .orElseThrow(() -> new RuntimeException("Équipement introuvable"));
        if (!mat.getDisponible())
            return new ReservationResponse(false, "Cet équipement est actuellement indisponible.",
                    java.math.BigDecimal.ZERO);

        LocalDateTime dateFin;
        if (req.getNombreMinutes() != null) {
            dateFin = req.getDateSession().plusMinutes(req.getNombreMinutes());
        } else {
            dateFin = req.getDateSession().plusHours(req.getNombreHeures());
        }

        Integer used = reservationRepository.sumReservedSpecificMaterialOverlapping(mat.getId(), req.getDateSession(),
                dateFin);
        if (used == null)
            used = 0;
        int maxDispo = mat.getQuantite() != null ? mat.getQuantite() : 0;
        if (used + req.getNombreMateriel() > maxDispo) {
            return new ReservationResponse(false, "Quantité d'équipement insuffisante pour ce créneau (Déjà " + used
                    + " réservé(s) sur " + maxDispo + ")", java.math.BigDecimal.ZERO);
        }

        // 🔹 NOUVEAU: Vérifier que la fin de séance est dans les horaires
        if (!isWithinWorkingHours(dateFin, s.getJoursOuverture(), s.getHeureOuverture(), s.getHeureFermeture())) {
            return new ReservationResponse(false, "La séance se termine après l'heure de fermeture du centre.",
                    java.math.BigDecimal.ZERO);
        }

        java.math.BigDecimal totalPreview;
        if (req.getNombreMinutes() != null) {
            java.math.BigDecimal baseRate = mat.getPrixParHeure() != null ? mat.getPrixParHeure() : java.math.BigDecimal.ZERO;
            java.math.BigDecimal durationFact = java.math.BigDecimal.valueOf(req.getNombreMinutes())
                    .divide(java.math.BigDecimal.valueOf(60), 4, java.math.RoundingMode.HALF_UP);
            totalPreview = baseRate.multiply(durationFact).multiply(java.math.BigDecimal.valueOf(req.getNombreMateriel()));
        } else {
            totalPreview = (mat.getPrixParHeure() != null ? mat.getPrixParHeure() : java.math.BigDecimal.ZERO)
                    .multiply(java.math.BigDecimal.valueOf(req.getNombreHeures()))
                    .multiply(java.math.BigDecimal.valueOf(req.getNombreMateriel()));
        }

        return new ReservationResponse(true, "Disponible", totalPreview);

    }

    public ReservationResponse reserverSortie(SortieReservationRequest req) {
        cancelExpiredPendingReservations();
        if (req.getSortieId() == null)
            throw new RuntimeException("ID sortie manquant");
        long sortieId = req.getSortieId();
        Sortie s = sortieRepository.findById(sortieId).orElseThrow(() -> new RuntimeException("Sortie non trouvée"));

        validateStrictDateTime(req.getDateSortie());
        if (!isWithinWorkingHours(req.getDateSortie(), s.getGuide().getJoursOuverture(),
                s.getGuide().getHeureOuverture(), s.getGuide().getHeureFermeture())) {
            return new ReservationResponse(false, "Le guide n'est pas disponible à cette heure/date.",
                    java.math.BigDecimal.ZERO);
        }
        if (s.getGuide() != null && s.getGuide().getUtilisateur() != null && s.getGuide().getUtilisateur().getEstBloque() != null && s.getGuide().getUtilisateur().getEstBloque()) {
            throw new RuntimeException("Ce guide est actuellement suspendu.");
        }

        // We use the request date/time, but the Sortie entity now has dateDebut
        Integer booked = reservationRepository.sumReservedPlacesForSortie(s.getId(), req.getDateSortie());
        if (booked + req.getNombreTickets() > s.getPlacesDisponibles())
            return new ReservationResponse(false, "Plus de places", java.math.BigDecimal.ZERO);

        java.math.BigDecimal total = (s.getPrix() != null ? s.getPrix() : java.math.BigDecimal.ZERO)
                .multiply(java.math.BigDecimal.valueOf(req.getNombreTickets()));
        Reservation res = new Reservation();
        res.setUtilisateur(getCurrentUser());
        res.setSortie(s);
        res.setNombrePersonnes(req.getNombreTickets());
        res.setDateDebut(req.getDateSortie());
        res.setStatut(Statut.EN_ATTENTE);
        res.setStatutPaiement(StatutPaiement.EN_ATTENTE);
        res.setServiceReserve("Sortie Guidée");
        
        BigDecimal finalTotal = (req.getPrixTotal() != null) ? req.getPrixTotal() : total;
        res.setPrixTotal(finalTotal);
        res.setClientNom(req.getClientNom());
        res.setClientPrenom(req.getClientPrenom());
        res.setClientEmail(req.getClientEmail());
        res.setClientTelephone(req.getClientTelephone());
        calculateInitialGains(res);
        Reservation saved = reservationRepository.save(res);

        // Notification centralisée pour le prestataire
        notifyProvider(saved, "CRÉÉE");
        notificationService.notifyAdmin("🗺️ Nouvelle réservation Sortie : " + s.getTitre() + " par " + saved.getUtilisateur().getNom() + " (" + finalTotal + " DT)");

        return new ReservationResponse(true, "Sortie réservée", finalTotal, saved.getId());
    }

    @Transactional(readOnly = false)
    public List<Reservation> findMyRestaurantReservations(String email) {
        Utilisateur user = utilisateurRepository.findByEmail(email).orElse(null);
        if (user == null)
            return java.util.Collections.emptyList();

        Restaurant resto = restaurantRepository.findByUtilisateurId(user.getId()).orElse(null);
        if (resto == null)
            return java.util.Collections.emptyList();

        List<Reservation> list = reservationRepository.findByRestaurantId(resto.getId())
                .stream()
                .filter(r -> r.getTypeReservation() != TypeReservation.EN_LIGNE || r.getStatutPaiement() == StatutPaiement.PAYE)
                .collect(java.util.stream.Collectors.toList());
        
        // 🔹 Force initialization of lazy relations inside transaction to prevent LazyInitializationException during JSON serialization
        for (Reservation r : list) {
            try {
                if (r.getRestaurant() != null && r.getRestaurant().getUtilisateur() != null) {
                    r.getRestaurant().getUtilisateur().getNom(); // touch to initialize
                }
                if (r.getTableResto() != null) {
                    r.getTableResto().getNumero(); // touch to initialize
                    if (r.getTableResto().getRestaurant() != null && r.getTableResto().getRestaurant().getUtilisateur() != null) {
                        r.getTableResto().getRestaurant().getUtilisateur().getNom(); // touch to initialize
                    }
                }
                // Initialize menu products
                if (r.getMenuProducts() != null) {
                    r.getMenuProducts().size();
                    r.getMenuProducts().forEach(mp -> {
                        if (mp.getMenu() != null) mp.getMenu().getNom();
                    });
                }
            } catch (Exception e) {
                System.err.println("⚠️ Lazy init warning for reservation #" + r.getId() + ": " + e.getMessage());
            }
        }
        
        updatePastReservations(list);
        return list;
    }

    @Transactional(readOnly = false)
    public List<Reservation> findMyCinemaReservations(String email) {
        Utilisateur user = utilisateurRepository.findByEmail(email).orElse(null);
        if (user == null)
            return java.util.Collections.emptyList();

        Cinema cinema = cinemaRepository.findByUtilisateurId(user.getId()).orElse(null);
        if (cinema == null)
            return java.util.Collections.emptyList();

        final Long cinId = cinema.getId();
        List<Reservation> list = reservationRepository.findAll().stream()
                .filter(r -> r.getFilm() != null
                        && r.getFilm().getCinema() != null
                        && r.getFilm().getCinema().getId().equals(cinId)
                        && (r.getTypeReservation() != TypeReservation.EN_LIGNE || r.getStatutPaiement() == StatutPaiement.PAYE))
                .sorted((a, b) -> Long.compare(b.getId(), a.getId()))
                .collect(java.util.stream.Collectors.toList());
        updatePastReservations(list);
        return list;
    }

    @Transactional(readOnly = false)
    public List<Reservation> findMyGuideReservations(String email) {
        Utilisateur user = utilisateurRepository.findByEmail(email).orElse(null);
        if (user == null)
            return java.util.Collections.emptyList();

        Guide guide = guideRepository.findByUtilisateurId(user.getId()).orElse(null);
        if (guide == null)
            return java.util.Collections.emptyList();

        final Long guideId = guide.getId();
        List<Reservation> list = reservationRepository.findAll().stream()
                .filter(r -> r.getSortie() != null
                        && r.getSortie().getGuide() != null
                        && r.getSortie().getGuide().getId().equals(guideId)
                        && (r.getTypeReservation() != TypeReservation.EN_LIGNE || r.getStatutPaiement() == StatutPaiement.PAYE))
                .sorted((a, b) -> Long.compare(b.getId(), a.getId()))
                .collect(java.util.stream.Collectors.toList());
        updatePastReservations(list);
        return list;
    }

    private String extractNom(Utilisateur user) {
        if (user == null) return "Client";
        return user.getNom() != null ? user.getNom() : "";
    }

    private String extractPrenom(Utilisateur user) {
        if (user == null) return "";
        return user.getPrenom() != null ? user.getPrenom() : "";
    }

    @Transactional(readOnly = false)
    public List<Reservation> findMyEventReservations(String email) {
        List<Reservation> list = reservationRepository.findByEvenementUtilisateurEmail(email)
                .stream()
                .filter(r -> r.getTypeReservation() != TypeReservation.EN_LIGNE || r.getStatutPaiement() == StatutPaiement.PAYE)
                .collect(java.util.stream.Collectors.toList());
        updatePastReservations(list);
        return list;
    }

    @Transactional(readOnly = false)
    public List<Reservation> findMySportReservations(String email) {
        List<Reservation> list = reservationRepository.findBySportEmailOrderByIdDesc(email)
                .stream()
                .filter(r -> r.getTypeReservation() != TypeReservation.EN_LIGNE || r.getStatutPaiement() == StatutPaiement.PAYE)
                .collect(java.util.stream.Collectors.toList());
        updatePastReservations(list);
        return list;
    }

    private boolean isWithinWorkingHours(LocalDateTime date, String joursOuverture, String heureOuverture,
            String heureFermeture) {
        // Validation des jours
        if (joursOuverture != null && !joursOuverture.trim().isEmpty()) {
            int dayOfWeek = date.getDayOfWeek().getValue(); // 1=Mon, ..., 7=Sun
            String dayStr = String.valueOf(dayOfWeek);

            boolean isAllowed = false;
            // Split par virgule, point-virgule ou tiret pour plus de souplesse
            String[] parts = joursOuverture.split("[,;\\-]+");
            for (String p : parts) {
                if (p.trim().equals(dayStr)) {
                    isAllowed = true;
                    break;
                }
            }
            if (!isAllowed) {
                System.out.println("DEBUG: Refus jour - Attendu: " + joursOuverture + ", Reçu: " + dayStr);
                return false;
            }
        }

        // Validation des heures
        if (heureOuverture != null && !heureOuverture.trim().isEmpty() && heureFermeture != null
                && !heureFermeture.trim().isEmpty()) {
            java.time.LocalTime t = date.toLocalTime();
            int resMin = t.getHour() * 60 + t.getMinute();

            int openMin = parseToMinutes(heureOuverture);
            int closeMin = parseToMinutes(heureFermeture);

            // Si même heure (cas improbable ou erreur), on considère ouvert toute la
            // journée (00:00 - 00:00)
            if (openMin == closeMin && openMin != 0) {
                return true;
            }

            if (openMin < closeMin) {
                // Cas normal : 08:00 -> 16:00
                return (resMin >= openMin && resMin <= closeMin);
            } else {
                // Cas nocturne : 18:00 -> 02:00
                // On est ouvert si on est APRES l'ouverture OU AVANT la fermeture du lendemain
                return (resMin >= openMin || resMin <= closeMin);
            }
        }

        // Par défaut, si pas d'heures, on autorise (pour ne pas bloquer les
        // établissements non configurés)
        return true;
    }

    private int parseToMinutes(String time) {
        if (time == null)
            return 0;
        try {
            // Nettoyer la chaîne: "16h30" -> "16:30", "16h" -> "16:00"
            String clean = time.toLowerCase().replace("h", ":").trim();
            if (!clean.contains(":"))
                clean += ":00";

            String[] p = clean.split(":");
            int h = Integer.parseInt(p[0].trim());
            int m = (p.length > 1 && !p[1].isEmpty()) ? Integer.parseInt(p[1].split("[^0-9]")[0].trim()) : 0;
            return h * 60 + m;
        } catch (Exception e) {
            return 0;
        }
    }

    private void calculateInitialGains(Reservation res) {
        java.math.BigDecimal total = res.getPrixTotal() != null ? res.getPrixTotal() : java.math.BigDecimal.ZERO;
        res.setCommissionAdmin(priceService.multiply(total, 0.1));
        res.setGainPrestataire(priceService.multiply(total, 0.9));
    }

    private void notifyProvider(Reservation res, String action) {
        if (res == null)
            return;
        Long providerId = null;
        String serviceName = "votre service";

        try {
            // 1. HOTEL (Priorité: Chambre -> Hotel -> Utilisateur OR hotelId fallback)
            if (res.getChambre() != null && res.getChambre().getHotel() != null) {
                Hotel h = res.getChambre().getHotel();
                if (h.getUtilisateur() != null) {
                    providerId = h.getUtilisateur().getId();
                    serviceName = "Hôtel ("
                            + (h.getUtilisateur().getNom() != null ? h.getUtilisateur().getNom() : h.getId()) + ")";
                }
            } else if (res.getHotelId() != null) {
                hotelRepository.findById(res.getHotelId()).ifPresent(h -> {
                    if (h.getUtilisateur() != null) {
                        res.setChambre(null); // Just in case it was a proxy that failed
                        // No, let's just use local vars
                    }
                });
                // Let's refine this
                Hotel fallbackHotel = hotelRepository.findById(res.getHotelId()).orElse(null);
                if (fallbackHotel != null && fallbackHotel.getUtilisateur() != null) {
                    providerId = fallbackHotel.getUtilisateur().getId();
                    serviceName = "Hôtel ("
                            + (fallbackHotel.getUtilisateur().getNom() != null ? fallbackHotel.getUtilisateur().getNom()
                                    : fallbackHotel.getId())
                            + ")";
                }
            }

            // 2. RESTAURANT
            if (providerId == null && res.getTableResto() != null && res.getTableResto().getRestaurant() != null) {
                Restaurant rest = res.getTableResto().getRestaurant();
                if (rest.getUtilisateur() != null) {
                    providerId = rest.getUtilisateur().getId();
                    serviceName = "Restaurant ("
                            + (rest.getUtilisateur().getNom() != null ? rest.getUtilisateur().getNom() : rest.getId())
                            + ")";
                }
            }

            // 3. CINEMA / FILM
            if (providerId == null && res.getFilm() != null && res.getFilm().getCinema() != null) {
                Cinema cinema = res.getFilm().getCinema();
                if (cinema.getUtilisateur() != null) {
                    providerId = cinema.getUtilisateur().getId();
                    serviceName = "Cinéma ("
                            + (cinema.getUtilisateur().getNom() != null ? cinema.getUtilisateur().getNom()
                                    : cinema.getId())
                            + " - " + res.getFilm().getTitre() + ")";
                }
            }

            // 4. EVENEMENT
            if (providerId == null && res.getEvenement() != null) {
                if (res.getEvenement().getUtilisateur() != null) {
                    providerId = res.getEvenement().getUtilisateur().getId();
                    serviceName = "Événement (" + res.getEvenement().getTitre() + ")";
                }
            }

            // 5. SPORT
            if (providerId == null && res.getSport() != null) {
                if (res.getSport().getUtilisateur() != null) {
                    providerId = res.getSport().getUtilisateur().getId();
                    serviceName = "Sport (" + res.getSport().getNomActivite() + ")";
                }
            }

            // 6. MATERIEL SPORT
            if (providerId == null && res.getMaterielSport() != null && res.getMaterielSport().getSport() != null) {
                Sport sport = res.getMaterielSport().getSport();
                if (sport.getUtilisateur() != null) {
                    providerId = sport.getUtilisateur().getId();
                    serviceName = "Matériel Sport (" + res.getMaterielSport().getNom() + ")";
                }
            }

            // 7. GUIDE / SORTIE
            if (providerId == null && res.getSortie() != null && res.getSortie().getGuide() != null) {
                Guide guide = res.getSortie().getGuide();
                if (guide.getUtilisateur() != null) {
                    providerId = guide.getUtilisateur().getId();
                    serviceName = "Guide/Sortie (" + res.getSortie().getTitre() + ")";
                }
            }

            if (providerId != null) {
                String clientName = (res.getClientNom() != null ? res.getClientNom() : "") + " "
                        + (res.getClientPrenom() != null ? res.getClientPrenom() : "");
                String message = "🔔 La réservation de " + clientName.trim() + " pour " + serviceName + " a été "
                        + action + ".";

                System.out.println("📢 Notification Prestataire - ID: " + providerId + " | Action: " + action
                        + " | Message: " + message);
                notificationService.sendPrivateNotification(providerId, message);
            } else {
                System.err.println("⚠️ Impossible d'identifier le prestataire pour la réservation ID: " + res.getId());
            }

        } catch (Exception e) {
            System.err.println("❌ Erreur lors de la notification du prestataire: " + e.getMessage());
            e.printStackTrace();
        }
    }

    @Transactional(readOnly = true)
    public void checkAvailabilityBeforePayment(Long reservationId) {
        Reservation r = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Réservation introuvable"));

        // Hotel : on exclut la réservation courante de la vérification de disponibilité
        if (r.getHotelId() != null && r.getChambre() != null) {
            Integer filterSimples = r.getNbLitsSimples() != null && r.getNbLitsSimples() > 0 ? r.getNbLitsSimples() : null;
            Integer filterDoubles = r.getNbLitsDoubles() != null && r.getNbLitsDoubles() > 0 ? r.getNbLitsDoubles() : null;

            String availError = checkRoomsAvailabilityExcluding(
                    r.getHotelId(),
                    r.getDateDebut(),
                    r.getDateFin(),
                    r.getChambre().getType(),
                    r.getNombreChambres() != null ? r.getNombreChambres() : 1,
                    filterSimples,
                    filterDoubles,
                    r.getListeProduitsChoisis(),
                    reservationId);

            if (availError != null) {
                throw new RuntimeException(availError);
            }
        }
        // Restaurant : on exclut la réservation courante du comptage
        else if (r.getTableResto() != null) {
            Long used = reservationRepository.countReservedTableExcluding(
                    r.getTableResto().getId(), r.getDateDebut(), r.getDateFin(), reservationId);
            if (used > 0) {
                throw new RuntimeException("Cette table a été réservée entre-temps.");
            }
        }
        // Cinema
        else if (r.getFilm() != null) {
            if (r.getFilm().getPlacesDisponibles() < r.getNombrePersonnes()) {
                throw new RuntimeException("Plus de places disponibles pour ce film.");
            }
        }
        // Evenement
        else if (r.getEvenement() != null) {
            if (r.getEvenement().getPlacesDisponibles() < r.getNombrePersonnes()) {
                throw new RuntimeException("Plus de places disponibles pour cet événement.");
            }
        }
        // Sport : on exclut la réservation courante du comptage de matériel
        else if (r.getSport() != null && r.getMaterielSport() != null) {
            Integer used = reservationRepository.sumReservedSpecificMaterialOverlappingExcluding(
                    r.getMaterielSport().getId(), r.getDateDebut(), r.getDateFin(), reservationId);
            if (used == null) used = 0;
            int maxDispo = r.getMaterielSport().getQuantite() != null ? r.getMaterielSport().getQuantite() : 0;
            if (used + r.getNombreMateriel() > maxDispo) {
                throw new RuntimeException("Quantité d'équipement insuffisante pour ce créneau.");
            }
        }
        // Sortie : on exclut la réservation courante
        else if (r.getSortie() != null) {
            Integer booked = reservationRepository.sumReservedPlacesForSortieExcluding(
                    r.getSortie().getId(), r.getDateDebut(), reservationId);
            if (booked == null) booked = 0;
            if (booked + r.getNombrePersonnes() > r.getSortie().getPlacesDisponibles()) {
                throw new RuntimeException("Plus de places disponibles pour cette sortie.");
            }
        }
    }

    private void setClientInfo(Reservation res, RestaurantReservationRequest req, Utilisateur user) {
        String nom = (req.getClientNom() != null && !req.getClientNom().trim().isEmpty()) ? req.getClientNom() : extractNom(user);
        String prenom = (req.getClientPrenom() != null && !req.getClientPrenom().trim().isEmpty()) ? req.getClientPrenom() : extractPrenom(user);
        String email = (req.getClientEmail() != null && !req.getClientEmail().trim().isEmpty()) ? req.getClientEmail() : (user != null ? user.getEmail() : null);
        String tel = (req.getClientTelephone() != null && !req.getClientTelephone().trim().isEmpty()) ? req.getClientTelephone() : (user != null ? user.getTelephone() : null);

        res.setClientNom(nom);
        res.setClientPrenom(prenom);
        res.setClientEmail(email);
        res.setClientTelephone(tel);
    }
}
