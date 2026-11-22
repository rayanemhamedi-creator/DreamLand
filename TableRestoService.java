package djerbatourb.djerbatourb.service;

import djerbatourb.djerbatourb.entity.Statut;
import djerbatourb.djerbatourb.entity.TableResto;
import djerbatourb.djerbatourb.repository.ReservationRepository;
import djerbatourb.djerbatourb.repository.TableRestoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class TableRestoService {
    private final TableRestoRepository repository;
    private final RestaurantService restaurantService;
    private final ReservationRepository reservationRepository;
    private final NotificationService notificationService;

    public TableRestoService(TableRestoRepository repository, 
                             RestaurantService restaurantService,
                             ReservationRepository reservationRepository,
                             NotificationService notificationService) {
        this.repository = repository;
        this.restaurantService = restaurantService;
        this.reservationRepository = reservationRepository;
        this.notificationService = notificationService;
    }

    public List<TableResto> findAll() { return repository.findAll(); }
    public List<TableResto> findByRestaurantEmail(String email) {
        djerbatourb.djerbatourb.entity.Restaurant rest = restaurantService.findByEmail(email);
        return repository.findByRestaurantId(rest.getId());
    }

    @Transactional
    public TableResto addTableToRestaurant(TableResto entity, String email) {
        djerbatourb.djerbatourb.entity.Restaurant rest = restaurantService.findByEmail(email);
        entity.setRestaurant(rest);
        
        boolean isUpdate = (entity.getId() != null);
        TableResto saved = repository.save(entity);
        
        String tableDesc = "Table " + (saved.getNumero() != null ? saved.getNumero() : saved.getId());
        if (isUpdate) {
            notificationService.notifyUpdatedService("Table", tableDesc);
        } else {
            notificationService.notifyNewService("Nouvelle Table chez " + rest.getUtilisateur().getNom(), tableDesc);
        }
        
        return saved;
    }

    public TableResto findById(Long id) { 
        if (id == null) return null;
        return repository.findById(id).orElse(null); 
    }
    @Transactional
    public TableResto save(TableResto entity) { 
        if (entity == null) return null;
        TableResto saved = repository.save(entity);
        String tableDesc = "Table " + (saved.getNumero() != null ? saved.getNumero() : saved.getId());
        notificationService.notifyUpdatedService("Table", tableDesc);
        return saved;
    }
    @Transactional
    public void deleteById(Long id) { 
        if (id == null) return;
        TableResto table = repository.findById(id).orElse(null);
        if (table != null) {
            List<Long> affectedUserIds = reservationRepository.findByTableRestoIdAndStatut(id, Statut.CONFIRMEE)
                    .stream()
                    .map(r -> r.getUtilisateur().getId())
                    .collect(Collectors.toList());
            
            String tableDesc = "Table " + (table.getNumero() != null ? table.getNumero() : table.getId());
            notificationService.notifyDeletedService("Table", tableDesc, affectedUserIds);
            repository.deleteById(id); 
        }
    }
}
