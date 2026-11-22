package djerbatourb.djerbatourb.controller;

import djerbatourb.djerbatourb.service.ExchangeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/exchange-rate")
public class ExchangeController {

    private final ExchangeService exchangeService;

    public ExchangeController(ExchangeService exchangeService) {
        this.exchangeService = exchangeService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getExchangeRate() {
        Map<String, Object> response = new HashMap<>();
        response.put("currency", "TND");
        response.put("rate", exchangeService.getCachedTndRate());
        response.put("lastUpdated", exchangeService.getLastUpdated().toString());
        return ResponseEntity.ok(response);
    }
}
