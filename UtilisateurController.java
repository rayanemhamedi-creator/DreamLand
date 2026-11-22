package djerbatourb.djerbatourb.controller;

import djerbatourb.djerbatourb.entity.Utilisateur;
import djerbatourb.djerbatourb.service.UtilisateurService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/utilisateurs")
public class UtilisateurController {
    private final UtilisateurService service;

    public UtilisateurController(UtilisateurService service) {
        this.service = service;
    }

    @GetMapping
    public List<Utilisateur> getAll() { return service.findAll(); }
    @GetMapping("/{id}")
    public Utilisateur getById(@PathVariable Long id) { return service.findById(id); }
    @PostMapping
    public Utilisateur create(@RequestBody Utilisateur entity) { return service.save(entity); }
    @PutMapping("/{id}")
    public Utilisateur update(@PathVariable Long id, @RequestBody Utilisateur entity) { return service.update(id, entity); }
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { service.deleteById(id); }

    @GetMapping("/en-attente")
    @PreAuthorize("hasRole('ADMIN')")
    public List<Utilisateur> getPendingValidations() {
        return service.findPendingValidations();
    }

    @PutMapping("/{id}/valider")
    @PreAuthorize("hasRole('ADMIN')")
    public void validateUser(@PathVariable Long id) {
        service.validateUser(id);
    }

    @PutMapping("/{id}/rejeter")
    @PreAuthorize("hasRole('ADMIN')")
    public void rejectUser(@PathVariable Long id) {
        service.rejectUser(id);
    }

    @PutMapping("/modifier-mot-de-passe")
    public void changePassword(@RequestBody djerbatourb.djerbatourb.dto.ChangePasswordRequest request, java.security.Principal principal) {
        service.changePassword(principal.getName(), request.getOldPassword(), request.getNewPassword());
    }

    @GetMapping("/public-stats")
    public java.util.Map<String, Long> getPublicStats() {
        return service.getPublicStats();
    }

    @GetMapping("/{id}/etablissement")
    public java.util.Map<String, Object> getEtablissementByUtilisateurId(@PathVariable Long id) {
        return service.getEtablissementByUtilisateurId(id);
    }
}
