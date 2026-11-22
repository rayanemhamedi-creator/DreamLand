package djerbatourb.djerbatourb.controller;

import djerbatourb.djerbatourb.entity.Guide;
import djerbatourb.djerbatourb.service.GuideService;
import djerbatourb.djerbatourb.service.SortieService;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/guides")
public class GuideController {
    private final GuideService service;
    private final SortieService sortieService;

    public GuideController(GuideService service, SortieService sortieService) {
        this.service = service;
        this.sortieService = sortieService;
    }

    @GetMapping("/me")
    public Guide getMe(Principal principal) {
        if (principal == null) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Non authentifié: Jeton expiré ou manquant");
        return service.findByEmail(principal.getName());
    }

    @GetMapping("/stats")
    public Map<String, Object> getStats(Principal principal) {
        if (principal == null) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Non authentifié: Jeton expiré ou manquant");
        return sortieService.getStats(principal.getName());
    }

    @GetMapping
    public List<Guide> getAll() { return service.findAll(); }

    @GetMapping("/{id}")
    public Guide getById(@PathVariable Long id) { return service.findById(id); }

    @PutMapping("/{id}")
    public Guide update(@PathVariable Long id, @RequestBody Guide entity, Principal principal) {
        if (principal == null) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Non authentifié: Jeton expiré ou manquant");
        return service.save(entity, principal.getName());
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { service.deleteById(id); }
}
