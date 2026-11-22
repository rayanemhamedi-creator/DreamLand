package djerbatourb.djerbatourb.controller;

import djerbatourb.djerbatourb.entity.Notification;
import djerbatourb.djerbatourb.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {

    private final NotificationService notificationService;
    private final djerbatourb.djerbatourb.repository.UtilisateurRepository utilisateurRepository;
    private final djerbatourb.djerbatourb.repository.MessageRepository messageRepository;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    public NotificationController(NotificationService notificationService,
                                  djerbatourb.djerbatourb.repository.UtilisateurRepository utilisateurRepository,
                                  djerbatourb.djerbatourb.repository.MessageRepository messageRepository,
                                  org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate) {
        this.notificationService = notificationService;
        this.utilisateurRepository = utilisateurRepository;
        this.messageRepository = messageRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Notification>> getNotifications(@PathVariable Long userId) {
        System.out.println("📥 Fetching notifications for user ID: " + userId);
        List<Notification> list = notificationService.getNotificationsForUser(userId);
        System.out.println("📤 Found " + list.size() + " notifications for user ID: " + userId);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/user/{userId}/unread-count")
    public ResponseEntity<Long> getUnreadCount(@PathVariable Long userId) {
        return ResponseEntity.ok(notificationService.getUnreadCount(userId));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/user/{userId}/read-all")
    public ResponseEntity<Void> markAllAsRead(@PathVariable Long userId) {
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(@PathVariable Long id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/guest-contact")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<Void> guestContact(@RequestBody java.util.Map<String, String> payload) {
        String email = payload.get("email");
        String message = payload.get("message");
        
        try {
            // 2. Trouver ou créer l'utilisateur Visiteur Anonyme
            String guestEmail = "guest@dreamland.com";
            djerbatourb.djerbatourb.entity.Utilisateur guest = utilisateurRepository.findByEmail(guestEmail).orElseGet(() -> {
                djerbatourb.djerbatourb.entity.Utilisateur u = new djerbatourb.djerbatourb.entity.Utilisateur();
                u.setEmail(guestEmail);
                u.setNom("Visiteur");
                u.setPrenom("Anonyme");
                u.setMotDePasse("$2a$10$PlaceholderPasswordNotUsed");
                u.setRole(djerbatourb.djerbatourb.entity.Role.TOURISTE);
                u.setEstBloque(false);
                u.setTelephone("");
                return utilisateurRepository.save(u);
            });

            // 3. Trouver l'admin
            djerbatourb.djerbatourb.entity.Utilisateur admin = utilisateurRepository.findAllByRole(djerbatourb.djerbatourb.entity.Role.ADMIN).stream().findFirst().orElse(null);
            if (admin != null) {
                // 4. Créer un message de chat préfixé par l'adresse email du guest
                String formattedContent = "✉️ [De: " + email + "]\n" + message;
                djerbatourb.djerbatourb.entity.Message msg = new djerbatourb.djerbatourb.entity.Message(guest, admin, formattedContent, "CONTACT");
                djerbatourb.djerbatourb.entity.Message saved = messageRepository.save(msg);
                
                // 5. Propager le message en temps réel via WebSocket pour rafraîchir l'inbox admin
                messagingTemplate.convertAndSend("/topic/messages/user/" + admin.getId(), saved);
            }
        } catch (Exception e) {
            System.err.println("Error saving guest message as chat message: " + e.getMessage());
        }
        
        return ResponseEntity.ok().build();
    }
}
