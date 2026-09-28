package br.org.rosalina.social.audit;
import br.org.rosalina.social.user.AppUser; import jakarta.persistence.*; import java.time.Instant; import java.util.UUID;
@Entity @Table(name="audit_event") public class AuditEvent {
 @Id @GeneratedValue private UUID id; @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="actor_id") private AppUser actor;
 @Column(nullable=false) private String action; @Column(name="entity_type",nullable=false) private String entityType; @Column(name="entity_id") private UUID entityId;
 @Column(name="occurred_at",nullable=false) private Instant occurredAt; @Column(nullable=false, columnDefinition="jsonb") private String metadata="{}";
 @PrePersist void create(){occurredAt=Instant.now();} public void setActor(AppUser v){actor=v;} public void setAction(String v){action=v;} public void setEntityType(String v){entityType=v;} public void setEntityId(UUID v){entityId=v;}
}
