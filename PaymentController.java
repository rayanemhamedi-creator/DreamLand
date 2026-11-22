package djerbatourb.djerbatourb.controller;

import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import djerbatourb.djerbatourb.entity.Reservation;
import djerbatourb.djerbatourb.repository.ReservationRepository;
import djerbatourb.djerbatourb.service.StripePaymentService;
import djerbatourb.djerbatourb.service.ReservationService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    @Value("${stripe.webhook.secret}")
    private String webhookSecret;

    private final StripePaymentService stripePaymentService;
    private final ReservationRepository reservationRepository;
    private final ReservationService reservationService;

    public PaymentController(StripePaymentService stripePaymentService, ReservationRepository reservationRepository, ReservationService reservationService) {
        this.stripePaymentService = stripePaymentService;
        this.reservationRepository = reservationRepository;
        this.reservationService = reservationService;
        System.out.println("🚀 PaymentController initialisé ! Les routes /api/payments sont prêtes.");
    }

    @PostMapping("/create-session/{reservationId}")
    public ResponseEntity<?> createCheckoutSession(@PathVariable Long reservationId) {
        try {
            Reservation reservation = reservationRepository.findById(reservationId)
                    .orElseThrow(() -> new RuntimeException("Réservation non trouvée"));

            // Vérification de disponibilité avant paiement
            reservationService.checkAvailabilityBeforePayment(reservationId);

            Session session = stripePaymentService.createCheckoutSession(reservation);
            
            Map<String, String> responseData = new HashMap<>();
            responseData.put("id", session.getId());
            responseData.put("url", session.getUrl());
            
            return ResponseEntity.ok(responseData);
        } catch (Exception e) {
            System.err.println("❌ Erreur lors de la création de la session Stripe: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    @GetMapping("/session/{sessionId}")
    public ResponseEntity<?> getReservationBySession(@PathVariable String sessionId) {
        try {
            Reservation res = stripePaymentService.verifySession(sessionId);
            if (res != null) {
                return ResponseEntity.ok(res);
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            System.err.println("❌ Erreur lors de la vérification de la session: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    @PostMapping("/webhook")
    public ResponseEntity<String> handleStripeWebhook(@RequestBody String payload, @RequestHeader("Stripe-Signature") String sigHeader) {
        System.out.println("📩 Webhook Stripe reçu !");
        Event event;

        try {
            event = Webhook.constructEvent(payload, sigHeader, webhookSecret);
            System.out.println("✅ Signature Webhook validée. Type d'événement: " + event.getType());
        } catch (SignatureVerificationException e) {
            System.err.println("❌ Erreur de signature Webhook : " + e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid signature");
        } catch (Exception e) {
            System.err.println("❌ Erreur de payload Webhook : " + e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid payload");
        }

        stripePaymentService.handleWebhook(event);
        return ResponseEntity.ok("Success");
    }
}
