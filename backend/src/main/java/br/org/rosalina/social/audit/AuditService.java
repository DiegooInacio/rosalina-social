package br.org.rosalina.social.audit;
import br.org.rosalina.social.user.*; import java.util.UUID; import org.springframework.security.core.Authentication; import org.springframework.security.core.context.SecurityContextHolder; import org.springframework.stereotype.Service;
@Service public class AuditService {
 private final AuditEventRepository repo; private final AppUserRepository users; public AuditService(AuditEventRepository r,AppUserRepository u){repo=r;users=u;}
 public void record(String action,String entity,UUID id){ AuditEvent e=new AuditEvent(); e.setAction(action);e.setEntityType(entity);e.setEntityId(id); Authentication a=SecurityContextHolder.getContext().getAuthentication(); if(a!=null&&a.isAuthenticated()) users.findByEmailIgnoreCase(a.getName()).ifPresent(e::setActor); repo.save(e); }
}
