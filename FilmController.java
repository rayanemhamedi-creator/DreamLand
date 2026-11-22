package djerbatourb.djerbatourb.controller;

import djerbatourb.djerbatourb.entity.Film;
import djerbatourb.djerbatourb.service.FilmService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/films")
public class FilmController {
    private final FilmService service;

    public FilmController(FilmService service) {
        this.service = service;
    }

    @GetMapping
    public List<Film> getAll() { 
        return service.findAll(); 
    }

    @GetMapping("/mon-cinema")
    public List<Film> getMyFilms(java.security.Principal principal) {
        return service.findByCinemaEmail(principal.getName());
    }

    @GetMapping("/cinema/{cinemaId}")
    public List<Film> getByCinemaId(@PathVariable Long cinemaId) {
        return service.findByCinemaId(cinemaId);
    }

    @PostMapping
    public Film create(@RequestBody Film entity, java.security.Principal principal) { 
        return service.addFilmToCinema(entity, principal.getName()); 
    }

    @PutMapping("/{id}")
    public Film update(@PathVariable Long id, @RequestBody Film entity, java.security.Principal principal) { 
        return service.addFilmToCinema(entity, principal.getName()); 
    }

    @GetMapping("/{id}")
    public Film getById(@PathVariable Long id) { return service.findById(id); }
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.deleteById(id);
    }
}
