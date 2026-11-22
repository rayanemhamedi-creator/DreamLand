package djerbatourb.djerbatourb.service;

import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import djerbatourb.djerbatourb.entity.Evenement;
import djerbatourb.djerbatourb.entity.Film;
import djerbatourb.djerbatourb.entity.StatutPaiement;
import djerbatourb.djerbatourb.entity.Reservation;
import djerbatourb.djerbatourb.repository.EvenementRepository;
import djerbatourb.djerbatourb.repository.FilmRepository;
import djerbatourb.djerbatourb.repository.ReservationRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;

@Service
public class StripePaymentService {

    @Value("${stripe.api.secretKey}")
    private String secretKey;

    private final ReservationRepository reservationRepository;
    private final FilmRepository filmRepository;
    private final EvenementRepository evenementRepository;
    private final ExchangeService exchangeService;

    public StripePaymentService(ReservationRepository reservationRepository, FilmRepository filmRepository, EvenementRepository evenementRepository, ExchangeService exchangeService) {
        this.reservationRepository = reservationRepository;
        this.filmRepository = filmRepository;
        this.evenementRepository = evenementRepository;
        this.exchangeService = exchangeService;
    }

    @PostConstruct
    public void init() {
        Stripe.apiKey = secretKey;
    }

    public Session createCheckoutSession(Reservation reservation) throws StripeException {
        System.out.println("💳 Tentative de création de session Stripe pour la réservation ID: " + reservation.getId());
        
        // Stripe expects amounts in cents
        // Conversion dynamique TND -> USD
        BigDecimal amountInEur = exchangeService.convertTndToEur(reservation.getPrixTotal());
        
        // Stripe expects amounts in cents, so we ensure 2 decimal places then multiply by 100
        long amountInCents = amountInEur.setScale(2, RoundingMode.HALF_UP).multiply(new BigDecimal(100)).longValue();
        
        System.out.println("💰 Montant original: " + reservation.getPrixTotal() + " TND");
        System.out.println("💰 Montant converti: " + amountInEur + " EUR");
        System.out.println("💰 Montant en cents: " + amountInCents);

        String baseUrl = "http://localhost:3000";
        String cancelUrl = baseUrl + "/touriste/mes-reservations";

        try {
            if (reservation.getSport() != null) {
                cancelUrl = baseUrl + "/reserver-sport/" + reservation.getSport().getId();
            } else if (reservation.getHotelId() != null) {
                cancelUrl = baseUrl + "/hotel/" + reservation.getHotelId();
            } else if (reservation.getTableResto() != null && reservation.getTableResto().getRestaurant() != null) {
                cancelUrl = baseUrl + "/reservation-resto/" + reservation.getTableResto().getRestaurant().getId();
            } else if (reservation.getFilm() != null && reservation.getFilm().getCinema() != null) {
                cancelUrl = baseUrl + "/cinema/" + reservation.getFilm().getCinema().getId();
            } else if (reservation.getEvenement() != null) {
                cancelUrl = baseUrl + "/reserver-ticket/evenement/" + reservation.getEvenement().getId();
            } else if (reservation.getSortie() != null) {
                cancelUrl = baseUrl + "/reserver-sortie/" + reservation.getSortie().getId();
            }
        } catch (Exception e) {
            System.out.println("⚠️ Erreur lors de la construction de l'URL de retour : " + e.getMessage());
        }

        SessionCreateParams params = SessionCreateParams.builder()
                .addAllPaymentMethodType(java.util.Collections.singletonList(SessionCreateParams.PaymentMethodType.CARD))
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .setSuccessUrl(baseUrl + "/payment-success?session_id={CHECKOUT_SESSION_ID}")
                .setCancelUrl(cancelUrl)
                .addLineItem(
                        SessionCreateParams.LineItem.builder()
                                .setQuantity(1L)
                                .setPriceData(
                                        SessionCreateParams.LineItem.PriceData.builder()
                                                .setCurrency("eur")
                                                .setUnitAmount(amountInCents)
                                                .setProductData(
                                                        SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                                                .setName("Réservation " + reservation.getServiceReserve())
                                                                .build()
                                                )
                                                .build()
                                )
                                .build()
                )
                .putMetadata("reservationId", String.valueOf(reservation.getId()))
                .build();

        Session session = Session.create(params);
        System.out.println("✅ Session Stripe créée avec succès: " + session.getId());
        
        reservation.setStripeSessionId(session.getId());
        reservationRepository.save(reservation);
        
        return session;
    }

    public void handleWebhook(Event event) {
        System.out.println("📬 Traitement de l'événement Webhook: " + event.getType());
        
        if ("checkout.session.completed".equals(event.getType())) {
            try {
                // Pour éviter les erreurs de désérialisation, on récupère l'objet Session via l'API Stripe
                // à partir de l'ID contenu dans l'événement.
                EventDataObjectDeserializer dataObjectDeserializer = event.getDataObjectDeserializer();
                String sessionId = "";
                
                if (dataObjectDeserializer.getObject().isPresent()) {
                    Session sessionData = (Session) dataObjectDeserializer.getObject().get();
                    sessionId = sessionData.getId();
                } else {
                    // Fallback si le mapping direct échoue : on extrait l'ID manuellement du JSON brut
                    String rawJson = dataObjectDeserializer.getRawJson();
                    // On cherche "id": "cs_test_..." dans le JSON
                    java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("\"id\"\\s*:\\s*\"([^\"]+)\"").matcher(rawJson);
                    if (matcher.find()) {
                        sessionId = matcher.group(1);
                    }
                }

                System.out.println("🔍 Récupération de la session Stripe depuis l'API: " + sessionId);
                Session session = Session.retrieve(sessionId);
                
                if (session != null) {
                    String reservationIdStr = session.getMetadata().get("reservationId");
                    System.out.println("🆔 Métadonnées réelles récupérées - reservationId: " + reservationIdStr);
                    
                    if (reservationIdStr != null) {
                        Long reservationId = Long.parseLong(reservationIdStr);
                        Optional<Reservation> reservationOpt = reservationRepository.findById(reservationId);
                        
                        if (reservationOpt.isPresent()) {
                            confirmPayment(reservationOpt.get());
                            System.out.println("✅ SUCCÈS : Réservation " + reservationId + " mise à jour comme PAYÉE et CONFIRMÉE.");
                        } else {
                            System.err.println("❌ ERREUR : Réservation " + reservationId + " introuvable en base de données.");
                        }
                    } else {
                        System.err.println("⚠️ ATTENTION : reservationId est manquant dans les métadonnées Stripe.");
                    }
                }
            } catch (StripeException e) {
                System.err.println("❌ ERREUR Stripe lors du Webhook : " + e.getMessage());
            } catch (Exception e) {
                System.err.println("❌ ERREUR générale lors du Webhook : " + e.getMessage());
            }
        } else {
            System.out.println("ℹ️ Événement ignoré (non traité): " + event.getType());
        }
    }

    public Reservation verifySession(String sessionId) throws StripeException {
        System.out.println("🔍 Vérification manuelle de la session Stripe: " + sessionId);
        Session session = Session.retrieve(sessionId);
        
        if (session != null && "paid".equals(session.getPaymentStatus())) {
            String reservationIdStr = session.getMetadata().get("reservationId");
            if (reservationIdStr != null) {
                Long reservationId = Long.parseLong(reservationIdStr);
                Optional<Reservation> reservationOpt = reservationRepository.findById(reservationId);
                
                if (reservationOpt.isPresent()) {
                    Reservation reservation = reservationOpt.get();
                    if (reservation.getStatutPaiement() != StatutPaiement.PAYE) {
                        confirmPayment(reservation);
                        System.out.println("✅ Manuel Sync SUCCÈS : Réservation " + reservationId + " mise à jour comme PAYÉE.");
                        return reservation;
                    }
                    return reservation;
                }
            }
        }
        return reservationRepository.findByStripeSessionId(sessionId).orElse(null);
    }

    private void confirmPayment(Reservation reservation) {
        reservation.setStatutPaiement(StatutPaiement.PAYE);
        reservation.setStatut(djerbatourb.djerbatourb.entity.Statut.CONFIRMEE);
        
        // Décrémenter les places uniquement après le paiement pour les Films et Événements
        if (reservation.getFilm() != null) {
            Film f = reservation.getFilm();
            f.setPlacesDisponibles(f.getPlacesDisponibles() - reservation.getNombrePersonnes());
            filmRepository.save(f);
        } else if (reservation.getEvenement() != null) {
            Evenement ev = reservation.getEvenement();
            ev.setPlacesDisponibles(ev.getPlacesDisponibles() - reservation.getNombrePersonnes());
            evenementRepository.save(ev);
        }
        
        reservationRepository.save(reservation);
    }
}
