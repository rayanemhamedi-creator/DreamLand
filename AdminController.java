package djerbatourb.djerbatourb.controller;

import djerbatourb.djerbatourb.dto.AdminStatisticsDTO;
import djerbatourb.djerbatourb.entity.Utilisateur;
import djerbatourb.djerbatourb.service.AdminService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/users")
    public List<Utilisateur> getTousLesUtilisateurs() {
        return adminService.getTousLesUtilisateurs();
    }

    @PutMapping("/users/{id}/block")
    public ResponseEntity<String> bloquerUtilisateur(@PathVariable Long id, @RequestParam boolean block) {
        if (id == null) return ResponseEntity.badRequest().body("ID manquant");
        adminService.bloquerUtilisateur(id, block);
        return ResponseEntity.ok(block ? "Utilisateur bloqué" : "Utilisateur débloqué");
    }

    @GetMapping("/statistics")
    public ResponseEntity<AdminStatisticsDTO> getStatistiques() {
        return ResponseEntity.ok(adminService.getStatistiques());
    }
}
