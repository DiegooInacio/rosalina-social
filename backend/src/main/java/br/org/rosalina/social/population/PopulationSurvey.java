package br.org.rosalina.social.population;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "population_survey")
public class PopulationSurvey {
  @Id @GeneratedValue UUID id;
  @Column(name = "reference_date", nullable = false) LocalDate referenceDate;
  @Column(name = "responsible_name", nullable = false, length = 150) String responsibleName;
  @Column(name = "responsible_cpf", length = 11) String responsibleCpf;
  @Column(name = "status", nullable = false, length = 20) String status = "COMPLETED";
  @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false, columnDefinition = "jsonb") PopulationDtos.SurveyData data;
  @OneToMany(mappedBy = "survey", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("position ASC") List<PopulationMember> members = new ArrayList<>();
  @Column(name = "created_by", nullable = false, updatable = false) UUID createdBy;
  @Column(name = "created_at", nullable = false, updatable = false) Instant createdAt;
  @Column(name = "updated_at", nullable = false) Instant updatedAt;
  @PrePersist void create() { createdAt = Instant.now(); updatedAt = createdAt; }
  @PreUpdate void update() { updatedAt = Instant.now(); }
}
