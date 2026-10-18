package br.org.rosalina.social.draft;

import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "form_draft")
public class FormDraft {
  @Id @GeneratedValue UUID id;
  @Column(name = "owner_id", nullable = false, updatable = false) UUID ownerId;
  @Enumerated(EnumType.STRING) @Column(name = "form_type", nullable = false, updatable = false, length = 30)
  DraftDtos.FormType formType;
  @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
  DraftDtos.Status status = DraftDtos.Status.DRAFT;
  @Column(length = 150) String title;
  @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false, columnDefinition = "jsonb") ObjectNode data;
  @Column(name = "record_id") UUID recordId;
  @Version long version;
  @Column(name = "created_at", nullable = false, updatable = false) Instant createdAt;
  @Column(name = "updated_at", nullable = false) Instant updatedAt;

  @PrePersist void create() { createdAt = Instant.now(); updatedAt = createdAt; }
  @PreUpdate void update() { updatedAt = Instant.now(); }
}
