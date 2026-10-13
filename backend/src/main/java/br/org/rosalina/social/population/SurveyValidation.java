package br.org.rosalina.social.population;

import br.org.rosalina.social.catalog.CatalogValidation;
import br.org.rosalina.social.common.ApiException;
import org.springframework.stereotype.Component;
import java.time.LocalDate;
import java.time.Period;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import static br.org.rosalina.social.catalog.CatalogCategory.*;
import static br.org.rosalina.social.common.FieldValidation.*;
import static br.org.rosalina.social.population.PopulationDtos.*;

@Component
public class SurveyValidation {
  private final CatalogValidation catalogs;
  public SurveyValidation(CatalogValidation catalogs) { this.catalogs = catalogs; }

  public Request normalize(Request request, LocalDate existingDate) {
    LocalDate date = request.referenceDate() != null ? request.referenceDate() : existingDate != null ? existingDate : today();
    notFuture(date, "referenceDate");
    Responsible r = request.responsible();
    catalogs.optional(r.birthSexId(), SEXO_NASCIMENTO, "responsible.birthSexId");
    catalogs.optional(r.racialIdentityId(), IDENTIFICACAO_RACIAL, "responsible.racialIdentityId");
    catalogs.optional(r.genderIdentityId(), GENERO, "responsible.genderIdentityId");
    catalogs.optional(r.sexualOrientationId(), ORIENTACAO_SEXUAL, "responsible.sexualOrientationId");
    catalogs.optional(r.maritalStatusId(), ESTADO_CIVIL, "responsible.maritalStatusId");
    catalogs.optional(r.educationId(), ESCOLARIDADE, "responsible.educationId");
    catalogs.optional(r.schoolTypeId(), TIPO_ESCOLA, "responsible.schoolTypeId");
    if (r.documentType() == DocumentType.CPF) throw ApiException.field("responsible.documentType", "Use RG ou CIN; CPF possui campo próprio.");
    documentPair(r.documentType(), r.documentNumber(), "responsible");
    Responsible responsible = new Responsible(text(r.name()), age(r.age(), r.birthDate(), date, "responsible"),
        text(r.socialName()), r.birthSexId(), r.racialIdentityId(), r.birthDate(), r.genderIdentityId(),
        r.sexualOrientationId(), r.maritalStatusId(), r.documentType(), text(r.documentNumber()),
        cpf(r.cpf(), "responsible.cpf"), phone(r.phone(), "responsible.phone"), text(r.birthplace()),
        text(r.nationality()), numeric(r.nis(), "responsible.nis", 20), r.educationId(), r.schoolTypeId(),
        text(r.email()), text(r.voterRegistration()));

    Address a = request.address();
    Address address = a == null ? null : new Address(text(a.street()), text(a.number()),
        zipCode(a.zipCode(), "address.zipCode"), text(a.city()), text(a.state()), text(a.neighborhood()), text(a.complement()));
    Housing h = request.housing();
    Housing housing = null;
    if (h != null) {
      boolean rented = h.type() == HousingType.ALUGADA;
      conditional(rented, h.landlordName(), "housing.landlordName");
      conditional(rented, h.landlordPhone(), "housing.landlordPhone");
      housing = new Housing(h.type(), h.roomCount(), text(h.landlordName()), phone(h.landlordPhone(), "housing.landlordPhone"),
          h.monthsInCommunity(), h.monthsAtAddress(), h.pipedWater(), h.electricity(), h.sewage(), h.residentCount());
    }
    WorkAndBenefits w = request.workAndBenefits();
    WorkAndBenefits work = null;
    if (w != null) {
      conditional(w.works(), w.occupation(), "workAndBenefits.occupation");
      conditional(w.receivesBenefit(), w.benefit(), "workAndBenefits.benefit");
      work = new WorkAndBenefits(w.works(), text(w.occupation()), w.receivesBenefit(), text(w.benefit()), w.minhaCasaMinhaVidaRegistered());
    }
    Health health = request.health();
    if (health != null) {
      conditional(health.hasDisability(), health.disabilityDescription(), "health.disabilityDescription");
      conditional(health.continuousMedication(), health.medications(), "health.medications");
      health = new Health(health.hasDisability(), text(health.disabilityDescription()), health.continuousMedication(),
          text(health.medications()), health.medicalCertificatePresented(), text(health.allergies()));
    }
    Declaration d = request.declaration();
    Declaration declaration = null;
    if (d != null) {
      notFuture(d.date(), "declaration.date");
      declaration = new Declaration(text(d.location()), d.date(), text(d.responsibleSignatureName()), text(d.registrarSignatureName()));
    }
    List<Member> members = new ArrayList<>();
    Set<String> documents = new HashSet<>();
    int responsibleCount = 0;
    for (Member m : request.members() == null ? List.<Member>of() : request.members()) {
      String path = "members[" + members.size() + "]";
      if (m.documentType() == DocumentType.RG) throw ApiException.field(path + ".documentType", "Use CPF ou CIN para integrantes.");
      documentPair(m.documentType(), m.documentNumber(), path);
      String number = m.documentType() == DocumentType.CPF ? cpf(m.documentNumber(), path + ".documentNumber") : text(m.documentNumber());
      Integer memberAge = age(m.age(), m.birthDate(), date, path);
      Member normalized = new Member(m.id(), text(m.name()), m.documentType(), number, memberAge,
          m.birthDate(), text(m.kinship()), m.income(), m.isResponsible());
      if (number != null && !documents.add(m.documentType() + ":" + number))
        throw ApiException.field(path + ".documentNumber", "Documento repetido na composição familiar.");
      if (m.isResponsible()) {
        responsibleCount++;
        if (!responsible.name().equals(normalized.name())) throw ApiException.field(path + ".name", "O nome deve corresponder ao responsável.");
        if (m.birthDate() != null && responsible.birthDate() != null && !m.birthDate().equals(responsible.birthDate()))
          throw ApiException.field(path + ".birthDate", "O nascimento deve corresponder ao responsável.");
        if (memberAge != null && responsible.age() != null && !memberAge.equals(responsible.age()))
          throw ApiException.field(path + ".age", "A idade deve corresponder ao responsável.");
        String expected = m.documentType() == DocumentType.CPF ? responsible.cpf() : responsible.documentType() == m.documentType() ? responsible.documentNumber() : null;
        if (number != null && expected != null && !Objects.equals(number, expected))
          throw ApiException.field(path + ".documentNumber", "O documento deve corresponder ao responsável.");
      } else if (number != null && ((m.documentType() == DocumentType.CPF && number.equals(responsible.cpf()))
          || (m.documentType() == responsible.documentType() && number.equals(responsible.documentNumber())))) {
        throw ApiException.field(path + ".isResponsible", "O responsável deve aparecer uma única vez.");
      }
      members.add(normalized);
    }
    if (!members.isEmpty() && responsibleCount != 1)
      throw ApiException.field("members", "Inclua o responsável exatamente uma vez.");
    return new Request(date, responsible, address, housing, work, health, List.copyOf(members), request.authorizations(), declaration);
  }

  static Integer age(Integer supplied, LocalDate birthDate, LocalDate referenceDate, String path) {
    if (birthDate == null) return supplied;
    if (birthDate.isAfter(referenceDate)) throw ApiException.field(path + ".birthDate", "Nascimento posterior à data do levantamento.");
    int calculated = Period.between(birthDate, referenceDate).getYears();
    if (supplied != null && supplied != calculated) throw ApiException.field(path + ".age", "Idade incompatível com a data de nascimento.");
    return calculated;
  }

  private static void documentPair(DocumentType type, String number, String path) {
    if (text(number) != null && type == null) throw ApiException.field(path + ".documentType", "Informe o tipo do documento.");
  }
}
