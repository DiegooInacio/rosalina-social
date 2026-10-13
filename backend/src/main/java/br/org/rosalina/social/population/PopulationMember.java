package br.org.rosalina.social.population;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "population_member")
public class PopulationMember {
  @Id @GeneratedValue UUID id;
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "survey_id", nullable = false) PopulationSurvey survey;
  @Column(nullable = false) int position;
  @Column(nullable = false, length = 150) String name;
  @Enumerated(EnumType.STRING) @Column(name = "document_type", length = 10) PopulationDtos.DocumentType documentType;
  @Column(name = "document_number", length = 30) String documentNumber;
  Integer age;
  @Column(name = "birth_date") LocalDate birthDate;
  @Column(length = 100) String kinship;
  @Column(precision = 12, scale = 2) BigDecimal income;
  @Column(name = "is_responsible", nullable = false) boolean isResponsible;

  PopulationDtos.Member response() {
    return new PopulationDtos.Member(id, name, documentType, documentNumber, age, birthDate, kinship, income, isResponsible);
  }
}
