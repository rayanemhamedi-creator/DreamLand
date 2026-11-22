package djerbatourb.djerbatourb.controller;

import djerbatourb.djerbatourb.entity.Hotel;
import djerbatourb.djerbatourb.service.HotelService;
import org.springframework.web.bind.annotation.*;
import org.springframework.format.annotation.DateTimeFormat;
import java.util.List;
import java.time.LocalDateTime;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/hotels")
public class HotelController {
    private final HotelService service;

    public HotelController(HotelService service) {
        this.service = service;
    }

    @GetMapping("/me")
    public Hotel getMe(java.security.Principal principal) {
        return service.findByEmail(principal.getName());
    }

    @GetMapping("/stats")
    public djerbatourb.djerbatourb.dto.HotelStatsDTO getStats(java.security.Principal principal) {
        return service.getStats(principal.getName());
    }

    @GetMapping
    public List<Hotel> getAll() { return service.findAll(); }
    @GetMapping("/{id}")
    public Hotel getById(@PathVariable Long id) { return service.findById(id); }
    @PostMapping
    public Hotel create(@RequestBody Hotel entity, java.security.Principal principal) { 
        return service.save(entity, principal.getName()); 
    }
    @PutMapping("/{id}")
    public Hotel update(@PathVariable Long id, @RequestBody Hotel entity, java.security.Principal principal) { 
        return service.save(entity, principal.getName()); 
    }
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { service.deleteById(id); }

    @GetMapping("/{id}/formules")
    public java.util.List<java.util.Map<String, Object>> getHotelFormules(@PathVariable Long id) {
        Hotel hotel = service.findById(id);
        java.util.List<java.util.Map<String, Object>> formules = new java.util.ArrayList<>();
        if (hotel == null) return formules;

        if (hotel.getPrixRO() != null) formules.add(createFormule("RO", hotel.getPrixRO()));
        if (hotel.getPrixBB() != null) formules.add(createFormule("BB", hotel.getPrixBB()));
        if (hotel.getPrixHB() != null) formules.add(createFormule("HB", hotel.getPrixHB()));
        if (hotel.getPrixFB() != null) formules.add(createFormule("FB", hotel.getPrixFB()));
        if (hotel.getPrixSoftAI() != null) formules.add(createFormule("SOFT_AI", hotel.getPrixSoftAI()));
        if (hotel.getPrixAllInclusive() != null) formules.add(createFormule("ALL_INCLUSIVE", hotel.getPrixAllInclusive()));

        return formules;
    }

    private java.util.Map<String, Object> createFormule(String type, java.math.BigDecimal prix) {
        java.util.Map<String, Object> map = new java.util.HashMap<>();
        map.put("id", type);
        map.put("type", type);
        map.put("prix", prix);
        return map;
    }

    @GetMapping("/search")
    public List<Hotel> searchHotels(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateDebut,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateFin,
            @RequestParam(required = false, defaultValue = "1") int chambres,
            @RequestParam(required = false, defaultValue = "2") int adultes,
            @RequestParam(required = false, defaultValue = "0") int enfants,
            @RequestParam(required = false) BigDecimal prixMax) {
        return service.searchHotels(dateDebut, dateFin, chambres, adultes, enfants, prixMax);
    }
}
