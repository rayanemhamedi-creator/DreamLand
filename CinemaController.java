package djerbatourb.djerbatourb.controller;

import djerbatourb.djerbatourb.entity.Cinema;
import djerbatourb.djerbatourb.service.CinemaService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/cinemas")
public class CinemaController {
    private final CinemaService service;

    public CinemaController(CinemaService service) {
        this.service = service;
    }

    @GetMapping
    public List<Cinema> getAll() { return service.findAll(); }

    @GetMapping("/search")
    public List<djerbatourb.djerbatourb.entity.Film> search(
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate date,
            @RequestParam(required = false) String genre,
            @RequestParam(required = false) java.math.BigDecimal prixMax) {
        
        return service.searchFilms(date, genre, prixMax);
    }

    @GetMapping("/me")
    public Cinema getMe(java.security.Principal principal) {
        return service.findByEmail(principal.getName());
    }

    @GetMapping("/stats")
    public java.util.Map<String, Object> getStats(java.security.Principal principal) {
        return service.getStats(principal.getName());
    }

    @GetMapping("/{id}")
    public Cinema getById(@PathVariable Long id) { return service.findById(id); }
    @PostMapping
    public Cinema create(@RequestBody Cinema entity, java.security.Principal principal) { 
        return service.save(entity, principal.getName()); 
    }
    @PutMapping("/{id}")
    public Cinema update(@PathVariable Long id, @RequestBody Cinema entity, java.security.Principal principal) { 
        return service.save(entity, principal.getName()); 
    }
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { service.deleteById(id); }
}
