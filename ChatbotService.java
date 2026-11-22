package djerbatourb.djerbatourb.service;

import djerbatourb.djerbatourb.dto.ChatbotRequest;
import djerbatourb.djerbatourb.dto.ChatbotResponse;
import djerbatourb.djerbatourb.entity.*;
import djerbatourb.djerbatourb.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ChatbotService {

    @Value("${gemini.api.key:}")
    private String apiKey;

    private final RestTemplate restTemplate;
    private final HotelRepository hotelRepository;
    private final RestaurantRepository restaurantRepository;
    private final SortieRepository sortieRepository;
    private final EvenementRepository evenementRepository;
    private final FilmRepository filmRepository;
    private final GuideRepository guideRepository;
    private final SportRepository sportRepository;

    public ChatbotService(RestTemplate restTemplate, HotelRepository hotelRepository,
                          RestaurantRepository restaurantRepository, SortieRepository sortieRepository,
                          EvenementRepository evenementRepository, FilmRepository filmRepository,
                          GuideRepository guideRepository, SportRepository sportRepository) {
        this.restTemplate = restTemplate;
        this.hotelRepository = hotelRepository;
        this.restaurantRepository = restaurantRepository;
        this.sortieRepository = sortieRepository;
        this.evenementRepository = evenementRepository;
        this.filmRepository = filmRepository;
        this.guideRepository = guideRepository;
        this.sportRepository = sportRepository;
    }

    public ChatbotResponse generatePlan(ChatbotRequest request) {
        ChatbotResponse response = new ChatbotResponse();

        try {
            String travelPlanText = callGemini(request);
            response.setPlan(travelPlanText);
        } catch (Exception e) {
            e.printStackTrace();
            response.setPlan(generateFallbackPlan(request));
            response.setMessage("Note: Le plan a été généré localement car le service IA est injoignable.");
        }

        LocalDateTime now = LocalDateTime.now();

        response.setHotels(fetchFilteredHotels(request.getBudget()));
        response.setRestaurants(fetchFilteredRestaurants());
        response.setActivities(fetchFilteredActivities(request.getPreferences()));

        response.setEvents(evenementRepository.findAllByUtilisateurEstBloqueFalseOrderByIdDesc().stream()
                .filter(e -> e.getDateFin().isAfter(now))
                .limit(5).collect(Collectors.toList()));

        response.setFilms(filmRepository.findAll().stream()
                .filter(f -> f.getDateProjection().isAfter(now))
                .limit(5).collect(Collectors.toList()));

        if (request.getNeedGuide() != null && request.getNeedGuide().contains("Oui")) {
            response.setGuides(guideRepository.findAllByUtilisateurEstBloqueFalse().stream().limit(3).collect(Collectors.toList()));
        }

        if (request.getPreferences() != null && request.getPreferences().contains("Sport")) {
            response.setSports(sportRepository.findAllByUtilisateurEstBloqueFalse().stream().limit(5).collect(Collectors.toList()));
        }

        return response;
    }

    @SuppressWarnings("unchecked")
    private String callGemini(ChatbotRequest request) {

        if (apiKey == null || apiKey.isEmpty()) {
            return "Note: Clé API Gemini manquante. Voici un plan générique.";
        }

        // ✅ MODIFICATION PRINCIPALE ICI
        String url = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=" + apiKey;
        String prompt = buildPrompt(request);

        Map<String, Object> requestBody = new HashMap<>();

        Map<String, Object> part = new HashMap<>();
        part.put("text", prompt);

        Map<String, Object> content = new HashMap<>();
        content.put("parts", Collections.singletonList(part));

        requestBody.put("contents", Collections.singletonList(content));

        Map<String, Object> generationConfig = new HashMap<>();
        generationConfig.put("temperature", 0.7);
        generationConfig.put("maxOutputTokens", 2048);

        requestBody.put("generationConfig", generationConfig);

        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);

        org.springframework.http.HttpEntity<Map<String, Object>> entity =
                new org.springframework.http.HttpEntity<>(requestBody, headers);

        try {
            System.out.println("🔵 Appel Gemini 2.0 Flash...");

            org.springframework.http.ResponseEntity<Map> responseEntity =
                    restTemplate.postForEntity(url, entity, Map.class);

            System.out.println("🟢 Status: " + responseEntity.getStatusCode());

            Map<String, Object> result = responseEntity.getBody();

            if (result == null) {
                throw new RuntimeException("Réponse vide de Gemini.");
            }

            if (result.containsKey("error")) {
                Map<String, Object> errorMap = (Map<String, Object>) result.get("error");
                throw new RuntimeException("Erreur API: " + errorMap.get("message"));
            }

            List<Map<String, Object>> candidates =
                    (List<Map<String, Object>>) result.get("candidates");

            if (candidates == null || candidates.isEmpty()) {
                throw new RuntimeException("Aucune réponse générée.");
            }

            Map<String, Object> firstCandidate = candidates.get(0);

            Map<String, Object> contentResult =
                    (Map<String, Object>) firstCandidate.get("content");

            List<Map<String, Object>> parts =
                    (List<Map<String, Object>>) contentResult.get("parts");

            String text = (String) parts.get(0).get("text");

            // ✅ DEBUG
            System.out.println("🧠 PLAN IA:\n" + text);

            return text;

        } catch (org.springframework.web.client.HttpClientErrorException e) {
            System.err.println("❌ Erreur HTTP Gemini : " + e.getResponseBodyAsString());
            throw new RuntimeException(e.getResponseBodyAsString());

        } catch (Exception e) {
            System.err.println("❌ Erreur Gemini : " + e.getMessage());
            throw new RuntimeException(e.getMessage());
        }
    }

    // 🔽 LE RESTE DE TON CODE (INCHANGÉ)

    private String generateFallbackPlan(ChatbotRequest request) {
        StringBuilder plan = new StringBuilder();

        plan.append("🌅 **Votre Voyage de ").append(request.getDays()).append(" jours à Djerba**\n\n");
        plan.append("📍 Plan généré automatiquement (fallback)...");

        return plan.toString();
    }

    private String buildPrompt(ChatbotRequest request) {
        return "Generate a travel plan for Djerba in French. Days: " + request.getDays();
    }

    private List<Hotel> fetchFilteredHotels(String budget) {
        try {
            List<Hotel> list = hotelRepository.findAllByUtilisateurEstBloqueFalse();
            Collections.shuffle(list);
            return list.stream().limit(5).collect(Collectors.toList());
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private List<Restaurant> fetchFilteredRestaurants() {
        try {
            List<Restaurant> list = restaurantRepository.findAllByUtilisateurEstBloqueFalse();
            Collections.shuffle(list);
            return list.stream().limit(10).collect(Collectors.toList());
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private List<Sortie> fetchFilteredActivities(List<String> preferences) {
        try {
            List<Sortie> list = sortieRepository.findAll();
            Collections.shuffle(list);
            return list.stream().limit(10).collect(Collectors.toList());
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}