package br.org.rosalina.social.catalog;

import br.org.rosalina.social.common.ApiException;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class CatalogValidation {
  private final CatalogItemRepository items;
  private final java.util.Set<UUID> retained;
  @org.springframework.beans.factory.annotation.Autowired
  public CatalogValidation(CatalogItemRepository items) { this(items, java.util.Set.of()); }
  public CatalogValidation(CatalogItemRepository items, java.util.Set<UUID> retained) { this.items = items; this.retained = retained; }
  public CatalogValidation retaining(java.util.Set<UUID> ids) { return new CatalogValidation(items, ids); }
  public CatalogItem optional(UUID id, CatalogCategory category, String field) {
    if (id == null) return null;
    var item = items.findById(id).orElseThrow(() -> ApiException.field(field, "Opção de catálogo inexistente."));
    if ((!item.isActive() && !retained.contains(id)) || item.getCategory() != category)
      throw ApiException.field(field, "Opção inativa ou de categoria incorreta.");
    return item;
  }
}
