package djerbatourb.djerbatourb.controller;

import djerbatourb.djerbatourb.dto.ChatbotRequest;
import djerbatourb.djerbatourb.dto.ChatbotResponse;
import djerbatourb.djerbatourb.service.ChatbotService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chatbot")
@CrossOrigin(origins = "*")
public class ChatbotController {

    private final ChatbotService chatbotService;

    public ChatbotController(ChatbotService chatbotService) {
        this.chatbotService = chatbotService;
    }

    @PostMapping("/generate-plan")
    public ResponseEntity<ChatbotResponse> generatePlan(@RequestBody ChatbotRequest request) {
        // Validation
        if (request.getDays() == null || request.getDays() < 1 || request.getDays() > 30) {
            ChatbotResponse errorResponse = new ChatbotResponse();
            errorResponse.setPlan("Erreur de validation");
            errorResponse.setMessage("Veuillez répondre correctement à la question (La durée doit être entre 1 et 30 jours).");
            return ResponseEntity.badRequest().body(errorResponse);
        }

        if (request.getBudget() == null || (!request.getBudget().equalsIgnoreCase("low") && 
            !request.getBudget().equalsIgnoreCase("medium") && !request.getBudget().equalsIgnoreCase("high"))) {
            ChatbotResponse errorResponse = new ChatbotResponse();
            errorResponse.setPlan("Erreur de validation");
            errorResponse.setMessage("Veuillez choisir un budget valide (faible, moyen ou élevé).");
            return ResponseEntity.badRequest().body(errorResponse);
        }

        return ResponseEntity.ok(chatbotService.generatePlan(request));
    }
}
