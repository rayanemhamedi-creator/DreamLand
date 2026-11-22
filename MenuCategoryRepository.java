package djerbatourb.djerbatourb.repository;

import djerbatourb.djerbatourb.entity.MenuCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MenuCategoryRepository extends JpaRepository<MenuCategory, Long> {
    List<MenuCategory> findByProviderId(Long providerId);
}
