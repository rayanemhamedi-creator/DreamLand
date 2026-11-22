package djerbatourb.djerbatourb.controller;

import djerbatourb.djerbatourb.entity.Chambre;
import djerbatourb.djerbatourb.service.ChambreService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chambres")
public class ChambreController {
    private final ChambreService service;

    public ChambreController(ChambreService service) {
        this.service = service;
    }

    // Un prestataire ne voit que ses chambres
    @GetMapping
    public List<Chambre> getAll(Principal principal) { 
        return service.findByMyHotel(principal.getName()); 
    }

    @GetMapping("/{id}")
    public Chambre getById(@PathVariable Long id) { 
        if (id == null) return null;
        return service.findById(id); 
    }

    @GetMapping("/hotel/{hotelId}")
    public List<Chambre> getByHotelId(@PathVariable Long hotelId) {
        return service.findByHotelId(hotelId);
    }

    // Ajout d'une chambre liée à l'hôtel connecté
    @PostMapping
    public Chambre create(@RequestBody Chambre entity, Principal principal) { 
        return service.addRoomToHotel(entity, principal.getName()); 
    }

    @PutMapping("/{id}")
    public Chambre update(@PathVariable Long id, @RequestBody Chambre entity, Principal principal) { 
        // Force l'ID et délègue à save en vérifiant l'hôtel
        entity.setId(id);
        return service.addRoomToHotel(entity, principal.getName()); 
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        if (id == null) return;
        service.deleteById(id);
    }

    /**
     * Définit une période d'indisponibilité pour une chambre.
     * Body attendu : { "dateDebut": "2024-07-01T00:00:00", "dateFin": "2024-07-15T00:00:00" }
     */
    @PostMapping("/{id}/indisponibilite")
    public ResponseEntity<?> setIndisponibilite(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        try {
            LocalDateTime debut = LocalDateTime.parse(body.get("dateDebut"));
            LocalDateTime fin   = LocalDateTime.parse(body.get("dateFin"));
            Chambre updated = service.addIndisponibilite(id, debut, fin);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Supprime la période d'indisponibilité d'une chambre (la rend disponible à nouveau).
     */
    @DeleteMapping("/{id}/indisponibilite")
    public ResponseEntity<?> removeIndisponibilite(@PathVariable Long id) {
        try {
            Chambre updated = service.deleteIndisponibilite(id);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
