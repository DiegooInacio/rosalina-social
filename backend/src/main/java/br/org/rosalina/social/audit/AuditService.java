package br.org.rosalina.social.audit;
import br.org.rosalina.social.user.AppUserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class AuditService {
  private final AuditEventRepository repo;
  private final AppUserRepository users;
  private final ObjectMapper json;

  public AuditService(AuditEventRepository repo, AppUserRepository users, ObjectMapper json) {
    this.repo = repo; this.users = users; this.json = json;
  }

  public void record(String action, String entity, UUID id) { record(action, entity, id, Map.of()); }

  // Somente metadados explicitamente selecionados pelo chamador; nunca o formulário.
  public void record(String action, String entity, UUID id, Map<String, ?> metadata) {
    AuditEvent event = new AuditEvent();
    event.setAction(action); event.setEntityType(entity); event.setEntityId(id);
    try { event.setMetadata(json.writeValueAsString(metadata)); }
    catch (JsonProcessingException error) { throw new IllegalStateException("Não foi possível registrar a auditoria."); }
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication != null && authentication.isAuthenticated())
      users.findByEmailIgnoreCase(authentication.getName()).ifPresent(event::setActor);
    repo.save(event);
  }
}
