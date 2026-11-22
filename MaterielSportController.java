package djerbatourb.djerbatourb.controller;

import djerbatourb.djerbatourb.entity.MaterielSport;
import djerbatourb.djerbatourb.service.MaterielSportService;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/materiel-sports")
public class MaterielSportController {
    private final MaterielSportService service;

    public MaterielSportController(MaterielSportService service) {
        this.service = service;
    }

    @GetMapping
    public List<MaterielSport> getAll(Principal principal) {
        return service.findBySportEmail(principal.getName());
    }

    @PostMapping
    public MaterielSport create(@RequestBody MaterielSport entity, Principal principal) {
        return service.save(entity, principal.getName());
    }

    @PutMapping("/{id}")
    public MaterielSport update(@PathVariable Long id, @RequestBody MaterielSport entity, Principal principal) {
        entity.setId(id);
        return service.save(entity, principal.getName());
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.deleteById(id);
    }
}
