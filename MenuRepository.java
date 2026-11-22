package djerbatourb.djerbatourb.repository;

import djerbatourb.djerbatourb.entity.Menu;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MenuRepository extends JpaRepository<Menu, Long> {
    List<Menu> findByProviderId(Long providerId);
    List<Menu> findByProviderIdAndActifTrue(Long providerId);
    List<Menu> findByCategoryId(Long categoryId);
}
