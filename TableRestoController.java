package djerbatourb.djerbatourb.controller;

import djerbatourb.djerbatourb.entity.TableResto;
import djerbatourb.djerbatourb.service.TableRestoService;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/tables-resto")
public class TableRestoController {
    private final TableRestoService service;

    public TableRestoController(TableRestoService service) {
        this.service = service;
    }

    @GetMapping
    public java.util.List<TableResto> getAll(java.security.Principal principal) { 
        return service.findByRestaurantEmail(principal.getName()); 
    }

    @GetMapping("/{id}")
    public TableResto getById(@PathVariable Long id) { return service.findById(id); }

    @PostMapping
    public TableResto create(@RequestBody TableResto entity, java.security.Principal principal) { 
        return service.addTableToRestaurant(entity, principal.getName()); 
    }

    @PutMapping("/{id}")
    public TableResto update(@PathVariable Long id, @RequestBody TableResto entity, java.security.Principal principal) { 
        entity.setId(id);
        return service.addTableToRestaurant(entity, principal.getName()); 
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { service.deleteById(id); }
}
