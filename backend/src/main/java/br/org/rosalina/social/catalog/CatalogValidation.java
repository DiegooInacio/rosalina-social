package br.org.rosalina.social.catalog;

import br.org.rosalina.social.common.ApiException;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class CatalogValidation {
  private final CatalogItemRepository items;
  public CatalogValidation(CatalogItemRepository items) { this.items = items; }
  public CatalogItem optional(UUID id, CatalogCategory category, String field) {
    if (id == null) return null;
    var item = items.findById(id).orElseThrow(() -> ApiException.field(field, "Opção de catálogo inexistente."));
    if (!item.isActive() || item.getCategory() != category)
      throw ApiException.field(field, "Opção inativa ou de categoria incorreta.");
    return item;
  }
}
