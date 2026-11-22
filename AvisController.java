package djerbatourb.djerbatourb.controller;

import djerbatourb.djerbatourb.entity.Avis;
import djerbatourb.djerbatourb.entity.TypeService;
import djerbatourb.djerbatourb.service.AvisService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/avis")
@CrossOrigin(origins = "http://localhost:3000")
public class AvisController {

    @Autowired
    private AvisService avisService;

    @PostMapping
    public ResponseEntity<?> ajouterAvis(@RequestBody Avis avis) {
        try {
            return ResponseEntity.ok(avisService.ajouterAvis(avis));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/service/{type}/{id}")
    public ResponseEntity<List<Avis>> getAvisParService(
            @PathVariable TypeService type,
            @PathVariable Long id) {
        return ResponseEntity.ok(avisService.getAvisParService(type, id));
    }

    @GetMapping("/moyenne/{type}/{id}")
    public ResponseEntity<Map<String, Object>> getMoyenneAvis(
            @PathVariable TypeService type,
            @PathVariable Long id) {
        return ResponseEntity.ok(avisService.getMoyenneAvis(type, id));
    }

    @GetMapping("/moyennes")
    public ResponseEntity<Map<String, Object>> getAllMoyennes() {
        return ResponseEntity.ok(avisService.getAllMoyennes());
    }

    @GetMapping("/user/{userId}/service/{type}/{idService}")
    public ResponseEntity<?> getAvisUtilisateur(
            @PathVariable Long userId,
            @PathVariable TypeService type,
            @PathVariable Long idService) {
        java.util.Optional<Avis> avis = avisService.getAvisUtilisateur(userId, type, idService);
        if (avis.isPresent()) {
            return ResponseEntity.ok(avis.get());
        }
        return ResponseEntity.noContent().build();
    }
}
