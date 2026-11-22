package djerbatourb.djerbatourb.controller;

import djerbatourb.djerbatourb.entity.Sport;
import djerbatourb.djerbatourb.service.SportService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/sports")
public class SportController {
    private final SportService service;
    private final djerbatourb.djerbatourb.repository.MaterielSportRepository materielSportRepository;

    public SportController(SportService service, djerbatourb.djerbatourb.repository.MaterielSportRepository materielSportRepository) {
        this.service = service;
        this.materielSportRepository = materielSportRepository;
    }

    @GetMapping("/me")
    public Sport getMe(Principal principal) {
        return service.findByEmail(principal.getName());
    }

    @GetMapping("/stats")
    public java.util.Map<String, Object> getStats(Principal principal) {
        return service.getStats(principal.getName());
    }

    @GetMapping
    public List<Sport> getAll(Authentication auth) { 
        if (auth == null) return service.findAll();
        // Pour les touristes et admins, tout voir. Pour les prestataires, filtrer par utilisateur.
        if (auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_TOURISTE") || a.getAuthority().equals("ROLE_ADMIN"))) {
            return service.findAll();
        }
        return service.findByMySports(auth.getName()); 
    }

    @GetMapping("/{id}")
    public Sport getById(@PathVariable Long id) { return service.findById(id); }

    @GetMapping("/{id}/materiels")
    public List<djerbatourb.djerbatourb.entity.MaterielSport> getMateriels(@PathVariable Long id) {
        return materielSportRepository.findBySportIdOrderByIdDesc(id);
    }

    @GetMapping("/materiel/{matId}/disponibilite")
    public int getAvailableQuantity(@PathVariable Long matId, @RequestParam String start, @RequestParam int durationMinutes) {
        java.time.LocalDateTime dateTime = java.time.LocalDateTime.parse(start);
        return service.getAvailableQuantity(matId, dateTime, durationMinutes);
    }

    @PostMapping
    public Sport create(@RequestBody Sport entity, Principal principal) { 
        return service.addSportToUser(entity, principal.getName()); 
    }

    @PutMapping("/{id}")
    public Sport update(@PathVariable Long id, @RequestBody Sport entity, Principal principal) { 
        entity.setId(id);
        return service.addSportToUser(entity, principal.getName()); 
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { service.deleteById(id); }
}
