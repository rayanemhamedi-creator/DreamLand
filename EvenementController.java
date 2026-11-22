package djerbatourb.djerbatourb.controller;

import djerbatourb.djerbatourb.entity.Evenement;
import djerbatourb.djerbatourb.service.EvenementService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/evenements")
public class EvenementController {
    private final EvenementService service;

    public EvenementController(EvenementService service) {
        this.service = service;
    }

    // Un touriste voit TOUT, un prestataire ne voit que SES événements
    @GetMapping
    public List<?> getAll(Authentication authentication) {
        if (authentication == null || authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_TOURISTE") || a.getAuthority().equals("ROLE_ADMIN"))) {
            return service.findAll(); // Returns List<EvenementDTO>
        }
        String email = authentication.getName();
        return service.findByMyEvents(email); // Returns List<Evenement>
    }

    @GetMapping("/{id}")
    public Evenement getById(@PathVariable Long id) { 
        if (id == null) return null;
        return service.findById(id); 
    }

    @PostMapping
    public Evenement create(@RequestBody Evenement entity, Principal principal) { 
        return service.addEventToUser(entity, principal.getName()); 
    }

    @PutMapping("/{id}")
    public Evenement update(@PathVariable Long id, @RequestBody Evenement entity, Principal principal) { 
        entity.setId(id);
        return service.addEventToUser(entity, principal.getName()); 
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { 
        if (id == null) return;
        service.deleteById(id); 
    }
}
