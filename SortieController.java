package djerbatourb.djerbatourb.controller;

import djerbatourb.djerbatourb.entity.Sortie;
import djerbatourb.djerbatourb.service.SortieService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/sorties")
public class SortieController {
    private final SortieService service;

    public SortieController(SortieService service) {
        this.service = service;
    }

    @GetMapping
    public List<Sortie> getAll() { return service.findAll(); }
    @GetMapping("/mon-guide")
    public List<Sortie> getMySorties() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal().equals("anonymousUser")) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Non authentifié: Jeton expiré ou manquant");
        }
        String email = auth.getName();
        if (auth.getPrincipal() instanceof org.springframework.security.core.userdetails.UserDetails) {
            email = ((org.springframework.security.core.userdetails.UserDetails) auth.getPrincipal()).getUsername();
        }
        return service.findByGuideEmail(email);
    }

    @GetMapping("/{id}")
    public Sortie getById(@PathVariable Long id) { return service.findById(id); }

    @PostMapping
    public org.springframework.http.ResponseEntity<?> create(@RequestBody Sortie entity) {
        try {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated() || auth.getPrincipal().equals("anonymousUser")) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Non authentifié: Jeton expiré ou manquant");
            }
            String email = auth.getName();
            // Dans le cas où l'email est enfoui dans l'objet UserDetails
            if (auth.getPrincipal() instanceof org.springframework.security.core.userdetails.UserDetails) {
                email = ((org.springframework.security.core.userdetails.UserDetails) auth.getPrincipal()).getUsername();
            }
            
            Sortie created = service.addSortieToUser(entity, email);
            return org.springframework.http.ResponseEntity.ok(created);
        } catch(org.springframework.web.server.ResponseStatusException e) {
            throw e;
        } catch(Exception e) {
            e.printStackTrace();
            return org.springframework.http.ResponseEntity.status(500).body(java.util.Collections.singletonMap("message", e.getMessage() != null ? e.getMessage() : e.getClass().getName()));
        }
    }

    @PutMapping("/{id}")
    public Sortie update(@PathVariable Long id, @RequestBody Sortie entity) { 
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal().equals("anonymousUser")) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Non authentifié: Jeton expiré ou manquant");
        }
        String email = auth.getName();
        if (auth.getPrincipal() instanceof org.springframework.security.core.userdetails.UserDetails) {
            email = ((org.springframework.security.core.userdetails.UserDetails) auth.getPrincipal()).getUsername();
        }
        entity.setId(id);
        return service.addSortieToUser(entity, email); 
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { service.deleteById(id); }
}
