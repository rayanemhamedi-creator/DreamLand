package djerbatourb.djerbatourb.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.RestClientException;

import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

@Service
public class ExchangeService {

    @Value("${exchange.api.url}")
    private String apiUrl;

    private final RestTemplate restTemplate;
    
    // Default fallback rate if API is unavailable (1 EUR ≈ 3.37 TND)
    private static final BigDecimal DEFAULT_TND_RATE = new BigDecimal("3.37");

    private final AtomicReference<BigDecimal> cachedTndRate = new AtomicReference<>(DEFAULT_TND_RATE);
    private final AtomicReference<LocalDateTime> lastUpdated = new AtomicReference<>(LocalDateTime.now());

    public ExchangeService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @PostConstruct
    public void init() {
        fetchExchangeRate();
    }

    @Scheduled(fixedRate = 86400000) // Refresh every 24 hours
    @SuppressWarnings({"rawtypes", "unchecked"})
    public void fetchExchangeRate() {
        try {
            System.out.println("🔄 Fetching latest exchange rate from ExchangeRate-API...");
            Map response = restTemplate.getForObject(apiUrl, Map.class);
            if (response != null && response.containsKey("conversion_rates")) {
                Map rates = (Map) response.get("conversion_rates");
                if (rates != null && rates.containsKey("TND")) {
                    Object tndObj = rates.get("TND");
                    BigDecimal newRate = new BigDecimal(tndObj.toString());
                    cachedTndRate.set(newRate);
                    lastUpdated.set(LocalDateTime.now());
                    System.out.println("✅ Exchange rate updated successfully: 1 EUR = " + newRate + " TND");
                    return;
                }
            }
            System.err.println("⚠️ ExchangeRate-API response invalid or missing TND rate. Keeping previous rate: " + cachedTndRate.get());
        } catch (RestClientException e) {
            System.err.println("❌ Failed to fetch exchange rate: " + e.getMessage());
            System.err.println("⚠️ Keeping previous rate: " + cachedTndRate.get());
        } catch (Exception e) {
            System.err.println("❌ Unexpected error fetching exchange rate: " + e.getMessage());
            System.err.println("⚠️ Keeping previous rate: " + cachedTndRate.get());
        }
    }

    public BigDecimal getCachedTndRate() {
        return cachedTndRate.get();
    }

    public LocalDateTime getLastUpdated() {
        return lastUpdated.get();
    }

    public BigDecimal convertTndToEur(BigDecimal tndAmount) {
        if (tndAmount == null) {
            return BigDecimal.ZERO;
        }
        return tndAmount.divide(cachedTndRate.get(), 2, RoundingMode.HALF_UP);
    }
}
