package djerbatourb.djerbatourb.controller;

import djerbatourb.djerbatourb.entity.Message;
import djerbatourb.djerbatourb.entity.Utilisateur;
import djerbatourb.djerbatourb.service.AuthService;
import djerbatourb.djerbatourb.service.MessageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final MessageService messageService;
    private final AuthService authService;

    public MessageController(MessageService messageService, AuthService authService) {
        this.messageService = messageService;
        this.authService = authService;
    }

    @PostMapping("/envoyer")
    public ResponseEntity<Message> envoyerMessage(@RequestBody Map<String, Object> payload) {
        Utilisateur current = authService.getCurrentUser();
        Long receiverId = Long.valueOf(payload.get("receiverId").toString());
        String content = payload.get("content").toString();
        return ResponseEntity.ok(messageService.envoyerMessage(current.getId(), receiverId, content));
    }

    @GetMapping("/conversation/{interlocuteurId}")
    public ResponseEntity<List<Message>> getConversation(@PathVariable Long interlocuteurId) {
        Utilisateur current = authService.getCurrentUser();
        return ResponseEntity.ok(messageService.getConversation(current.getId(), interlocuteurId));
    }

    @GetMapping("/interlocuteurs")
    public ResponseEntity<List<Utilisateur>> getInterlocuteurs() {
        Utilisateur current = authService.getCurrentUser();
        return ResponseEntity.ok(messageService.getInterlocuteurs(current.getId()));
    }

    @GetMapping("/nombre-non-lus")
    public ResponseEntity<Long> getNombreNonLus() {
        Utilisateur current = authService.getCurrentUser();
        return ResponseEntity.ok(messageService.getNombreNonLus(current.getId()));
    }

    @PostMapping("/marquer-lu/{expediteurId}")
    public ResponseEntity<Void> marquerCommeLu(@PathVariable Long expediteurId) {
        Utilisateur current = authService.getCurrentUser();
        messageService.marquerCommeLu(current.getId(), expediteurId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/utilisateur-admin")
    public ResponseEntity<Utilisateur> getUtilisateurAdmin() {
        return ResponseEntity.ok(authService.getAdminUser());
    }

    @DeleteMapping("/{messageId}")
    public ResponseEntity<Void> supprimerMessage(@PathVariable Long messageId) {
        Utilisateur current = authService.getCurrentUser();
        messageService.supprimerMessage(messageId, current.getId());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/conversation/{interlocuteurId}")
    public ResponseEntity<Void> supprimerConversation(@PathVariable Long interlocuteurId) {
        Utilisateur current = authService.getCurrentUser();
        messageService.supprimerConversation(current.getId(), interlocuteurId);
        return ResponseEntity.ok().build();
    }
}
