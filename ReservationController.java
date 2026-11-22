package djerbatourb.djerbatourb.controller;

import djerbatourb.djerbatourb.dto.HotelReservationRequest;
import djerbatourb.djerbatourb.dto.RestaurantReservationRequest;
import djerbatourb.djerbatourb.dto.TicketReservationRequest;

import djerbatourb.djerbatourb.dto.SortieReservationRequest;
import djerbatourb.djerbatourb.dto.SportReservationRequest;
import djerbatourb.djerbatourb.dto.OfflineReservationRequest;
import djerbatourb.djerbatourb.dto.ReservationResponse;
import djerbatourb.djerbatourb.dto.ReservationDetailsRequest;
import djerbatourb.djerbatourb.entity.Reservation;
import djerbatourb.djerbatourb.service.ReservationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/reservations")
public class ReservationController {
    private final ReservationService service;

    public ReservationController(ReservationService service) { 
        this.service = service; 
    }

    @GetMapping
    public List<Reservation> getToutesLesReservations() { return service.findAll(); }

    @GetMapping("/mes-reservations")
    public List<Reservation> getMesReservations() {
        return service.findCurrentUserReservations();
    }

    @GetMapping("/annulees")
    public List<Reservation> getReservationsAnnulees() {
        return service.findAllCancelled();
    }

    @PostMapping("/{id}/annuler")
    public ResponseEntity<?> annulerReservation(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(service.cancelReservation(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/mon-hotel")
    public List<Reservation> getMesReservationsHotel() {
        return service.findMyHotelReservations();
    }

    @GetMapping("/mon-restaurant")
    public List<Reservation> getMesReservationsRestaurant(java.security.Principal principal) {
        return service.findMyRestaurantReservations(principal.getName());
    }
    
    @GetMapping("/mon-cinema")
    public List<Reservation> getMesReservationsCinema(java.security.Principal principal) {
        return service.findMyCinemaReservations(principal.getName());
    }

    @GetMapping("/mon-sport")
    public List<Reservation> getMesReservationsSport(java.security.Principal principal) {
        return service.findMySportReservations(principal.getName());
    }

    @GetMapping("/mon-guide")
    public List<Reservation> getMesReservationsGuide(java.security.Principal principal) {
        return service.findMyGuideReservations(principal.getName());
    }

    @GetMapping("/mes-evenements")
    public List<Reservation> getMesReservationsEvenement(Authentication authentication) {
        return service.findMyEventReservations(authentication.getName());
    }

    @GetMapping("/{id}")
    public Reservation getParId(@PathVariable Long id) { return service.findById(id); }

    @PostMapping("/hotel")
    public ResponseEntity<ReservationResponse> reserverHotel(@RequestBody HotelReservationRequest request) {
        try {
            ReservationResponse response = service.reserverHotel(request);
            if (response.isSuccess()) return ResponseEntity.ok(response);
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ReservationResponse(false, e.getMessage(), BigDecimal.ZERO));
        }
    }

    @PostMapping("/hotel/preview")
    public ResponseEntity<ReservationResponse> apercuHotel(@RequestBody HotelReservationRequest request) {
        try {
            ReservationResponse response = service.previewHotel(request);
            if (response.isSuccess()) return ResponseEntity.ok(response);
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ReservationResponse(false, e.getMessage(), BigDecimal.ZERO));
        }
    }

    @PostMapping("/restaurant")
    public ResponseEntity<ReservationResponse> reserverRestaurant(@RequestBody RestaurantReservationRequest request) {
        try {
            ReservationResponse response = service.reserverRestaurant(request);
            if (response.isSuccess()) return ResponseEntity.ok(response);
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ReservationResponse(false, e.getMessage(), BigDecimal.ZERO));
        }
    }

    @PostMapping("/cinema")
    public ResponseEntity<ReservationResponse> reserverCinema(@RequestBody TicketReservationRequest request) {
        try {
            ReservationResponse response = service.reserverFilm(request);
            if (response.isSuccess()) return ResponseEntity.ok(response);
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ReservationResponse(false, e.getMessage(), BigDecimal.ZERO));
        }
    }



    @PostMapping("/evenement")
    public ResponseEntity<ReservationResponse> reserverEvenement(@RequestBody TicketReservationRequest request) {
        try {
            ReservationResponse response = service.reserverEvenement(request);
            if (response.isSuccess()) return ResponseEntity.ok(response);
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ReservationResponse(false, e.getMessage(), BigDecimal.ZERO));
        }
    }

    @PostMapping("/sport")
    public ResponseEntity<ReservationResponse> reserverSport(@RequestBody SportReservationRequest request) {
        try {
            ReservationResponse response = service.reserverSport(request);
            if (response.isSuccess()) return ResponseEntity.ok(response);
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ReservationResponse(false, e.getMessage(), BigDecimal.ZERO));
        }
    }

    @PostMapping("/sport/preview")
    public ResponseEntity<ReservationResponse> apercuSport(@RequestBody SportReservationRequest request) {
        try {
            ReservationResponse response = service.previewSport(request);
            if (response.isSuccess()) return ResponseEntity.ok(response);
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ReservationResponse(false, e.getMessage(), BigDecimal.ZERO));
        }
    }


    @PostMapping("/sortie")
    public ResponseEntity<ReservationResponse> reserverSortie(@RequestBody SortieReservationRequest request) {
        try {
            ReservationResponse response = service.reserverSortie(request);
            if (response.isSuccess()) return ResponseEntity.ok(response);
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ReservationResponse(false, e.getMessage(), BigDecimal.ZERO));
        }
    }

    @PostMapping("/offline")
    public ResponseEntity<ReservationResponse> reserverHorsLigne(@RequestBody OfflineReservationRequest request) {
        try {
            ReservationResponse response = service.createReservationOffline(request);
            if (response.isSuccess()) return ResponseEntity.ok(response);
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ReservationResponse(false, e.getMessage(), BigDecimal.ZERO));
        }
    }

    @PostMapping("/{id}/annuler-offline")
    public ResponseEntity<?> annulerReservationHorsLigne(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(service.cancelReservationOffline(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/mes-reservations-offline")
    public List<Reservation> getMesReservationsHorsLigne(Authentication authentication) {
        return service.findOfflineByPrestataire(authentication.getName());
    }

    @PutMapping("/{id}/details")
    public ResponseEntity<?> mettreAJourDetailsReservation(@PathVariable Long id, @RequestBody ReservationDetailsRequest request) {
        try {
            return ResponseEntity.ok(service.updateReservationDetails(id, request));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /** Dates occupées (CONFIRMEE) pour un hôtel – utilisé pour bloquer le calendrier frontend. */
    @GetMapping("/hotel/{hotelId}/dates-occupees")
    public ResponseEntity<?> getDatesOccupees(@PathVariable Long hotelId) {
        try {
            return ResponseEntity.ok(service.getDatesOccupeesHotel(hotelId));
        } catch (Exception e) {
            return ResponseEntity.ok(java.util.Collections.emptyList());
        }
    }
}

