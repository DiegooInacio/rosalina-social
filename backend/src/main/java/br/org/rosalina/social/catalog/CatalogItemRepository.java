package br.org.rosalina.social.catalog;
import java.util.*; import org.springframework.data.jpa.repository.JpaRepository;
public interface CatalogItemRepository extends JpaRepository<CatalogItem, UUID> { List<CatalogItem> findByCategoryOrderByName(CatalogCategory category); boolean existsByCategoryAndNameIgnoreCase(CatalogCategory category,String name); }
