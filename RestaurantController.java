package djerbatourb.djerbatourb.controller;

import djerbatourb.djerbatourb.entity.Restaurant;
import djerbatourb.djerbatourb.service.RestaurantService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/restaurants")
public class RestaurantController {
    private final RestaurantService service;

    public RestaurantController(RestaurantService service) {
        this.service = service;
    }

    @GetMapping
    public List<Restaurant> getAll() { return service.findAll(); }

    @GetMapping("/me")
    public Restaurant getMe(java.security.Principal principal) {
        return service.findByEmail(principal.getName());
    }

    @GetMapping("/stats")
    public java.util.Map<String, Object> getStats(java.security.Principal principal) {
        return service.getStats(principal.getName());
    }

    @GetMapping("/{id}")
    public Restaurant getById(@PathVariable Long id) { return service.findById(id); }
    @PostMapping
    public Restaurant create(@RequestBody Restaurant entity, java.security.Principal principal) { 
        return service.save(entity, principal.getName()); 
    }
    @PutMapping("/{id}")
    public Restaurant update(@PathVariable Long id, @RequestBody Restaurant entity, java.security.Principal principal) { 
        return service.save(entity, principal.getName()); 
    }
    @GetMapping("/{id}/tables-disponibles")
    public List<djerbatourb.djerbatourb.entity.TableResto> getAvailableTables(@PathVariable Long id, @RequestParam("dateHeure") @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.LocalDateTime dateHeure) {
        return service.findAvailableTables(id, dateHeure);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.deleteById(id);
    }
}
