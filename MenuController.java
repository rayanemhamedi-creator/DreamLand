package djerbatourb.djerbatourb.controller;

import djerbatourb.djerbatourb.entity.Menu;
import djerbatourb.djerbatourb.entity.MenuCategory;
import djerbatourb.djerbatourb.entity.Restaurant;
import djerbatourb.djerbatourb.entity.Utilisateur;
import djerbatourb.djerbatourb.repository.MenuCategoryRepository;
import djerbatourb.djerbatourb.repository.MenuRepository;
import djerbatourb.djerbatourb.repository.RestaurantRepository;
import djerbatourb.djerbatourb.repository.UtilisateurRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/menus")
@CrossOrigin("*")
public class MenuController {

    private final MenuRepository menuRepository;
    private final MenuCategoryRepository menuCategoryRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final RestaurantRepository restaurantRepository;

    public MenuController(MenuRepository menuRepository, MenuCategoryRepository menuCategoryRepository, UtilisateurRepository utilisateurRepository, RestaurantRepository restaurantRepository) {
        this.menuRepository = menuRepository;
        this.menuCategoryRepository = menuCategoryRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.restaurantRepository = restaurantRepository;
    }

    private Utilisateur getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String currentEmail = (principal instanceof UserDetails) ? ((UserDetails) principal).getUsername()
                : principal.toString();
        return utilisateurRepository.findByEmail(currentEmail)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
    }

    // --- Gestion des Catégories ---

    @GetMapping("/categories")
    public ResponseEntity<List<MenuCategory>> getMyCategories() {
        Utilisateur current = getCurrentUser();
        return ResponseEntity.ok(menuCategoryRepository.findByProviderId(current.getId()));
    }

    @PostMapping("/categories")
    public ResponseEntity<MenuCategory> addCategory(@RequestBody MenuCategory category) {
        Utilisateur current = getCurrentUser();
        category.setProviderId(current.getId());
        return ResponseEntity.ok(menuCategoryRepository.save(category));
    }

    @PutMapping("/categories/{id}")
    public ResponseEntity<MenuCategory> updateCategory(@PathVariable Long id, @RequestBody MenuCategory categoryUpdate) {
        MenuCategory category = menuCategoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Catégorie non trouvée"));
        if (!category.getProviderId().equals(getCurrentUser().getId())) {
            throw new RuntimeException("Non autorisé");
        }
        category.setNom(categoryUpdate.getNom());
        return ResponseEntity.ok(menuCategoryRepository.save(category));
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        MenuCategory category = menuCategoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Catégorie non trouvée"));
        if (!category.getProviderId().equals(getCurrentUser().getId())) {
            throw new RuntimeException("Non autorisé");
        }
        // Supprimer aussi les produits de cette catégorie
        List<Menu> menus = menuRepository.findByCategoryId(id);
        menuRepository.deleteAll(menus);
        
        menuCategoryRepository.delete(category);
        return ResponseEntity.ok().build();
    }

    // --- Pour le Prestataire (Dashboard Admin) ---
    
    @GetMapping("/mes-menus")
    public ResponseEntity<List<Menu>> getMyMenus() {
        Utilisateur current = getCurrentUser();
        Restaurant restaurant = restaurantRepository.findByUtilisateurId(current.getId()).orElse(null);
        if (restaurant == null) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(menuRepository.findByProviderId(restaurant.getId()));
    }

    @PostMapping
    public ResponseEntity<Menu> addMenu(@RequestBody Menu menu) {
        Utilisateur current = getCurrentUser();
        Restaurant restaurant = restaurantRepository.findByUtilisateurId(current.getId())
                .orElseThrow(() -> new RuntimeException("Restaurant non trouvé pour cet utilisateur"));
        menu.setProviderId(restaurant.getId());
        return ResponseEntity.ok(menuRepository.save(menu));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Menu> updateMenu(@PathVariable Long id, @RequestBody Menu menuUpdate) {
        Menu menu = menuRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Menu non trouvé"));
        Utilisateur current = getCurrentUser();
        Restaurant restaurant = restaurantRepository.findByUtilisateurId(current.getId())
                .orElseThrow(() -> new RuntimeException("Restaurant non trouvé"));
                
        if (!menu.getProviderId().equals(restaurant.getId())) {
            throw new RuntimeException("Non autorisé à modifier ce menu");
        }

        menu.setNom(menuUpdate.getNom());
        menu.setDescription(menuUpdate.getDescription());
        menu.setPrix(menuUpdate.getPrix());
        menu.setImage(menuUpdate.getImage());
        menu.setQuantiteDisponible(menuUpdate.getQuantiteDisponible());
        menu.setActif(menuUpdate.getActif());
        menu.setCategory(menuUpdate.getCategory());

        return ResponseEntity.ok(menuRepository.save(menu));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMenu(@PathVariable Long id) {
        Menu menu = menuRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Menu non trouvé"));
        Utilisateur current = getCurrentUser();
        Restaurant restaurant = restaurantRepository.findByUtilisateurId(current.getId())
                .orElseThrow(() -> new RuntimeException("Restaurant non trouvé"));

        if (!menu.getProviderId().equals(restaurant.getId())) {
            throw new RuntimeException("Non autorisé à supprimer ce menu");
        }

        menuRepository.delete(menu);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<Menu> toggleStatus(@PathVariable Long id) {
        Menu menu = menuRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Menu non trouvé"));
        Utilisateur current = getCurrentUser();
        Restaurant restaurant = restaurantRepository.findByUtilisateurId(current.getId())
                .orElseThrow(() -> new RuntimeException("Restaurant non trouvé"));

        if (!menu.getProviderId().equals(restaurant.getId())) {
            throw new RuntimeException("Non autorisé à modifier ce menu");
        }

        menu.setActif(!menu.getActif());
        return ResponseEntity.ok(menuRepository.save(menu));
    }

    // --- Pour le Touriste (Réservation) ---
    
    @GetMapping("/restaurant/{restaurantId}")
    public ResponseEntity<List<Menu>> getRestaurantMenus(@PathVariable Long restaurantId) {
        return ResponseEntity.ok(menuRepository.findByProviderIdAndActifTrue(restaurantId));
    }

    @GetMapping("/restaurant/{restaurantId}/categories")
    public ResponseEntity<List<MenuCategory>> getRestaurantCategories(@PathVariable Long restaurantId) {
        // Le providerId dans MenuCategory est l'ID utilisateur. 
        // On doit trouver l'utilisateur du restaurant.
        Restaurant rest = restaurantRepository.findById(restaurantId).orElseThrow();
        return ResponseEntity.ok(menuCategoryRepository.findByProviderId(rest.getUtilisateur().getId()));
    }
}
