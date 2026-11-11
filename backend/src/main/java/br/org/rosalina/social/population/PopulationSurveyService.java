package br.org.rosalina.social.population;

import br.org.rosalina.social.audit.AuditService;
import br.org.rosalina.social.common.ApiException;
import br.org.rosalina.social.common.NotFoundException;
import br.org.rosalina.social.user.AppUserRepository;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static br.org.rosalina.social.common.FieldValidation.*;
import static br.org.rosalina.social.population.PopulationDtos.*;

@Service
@Transactional
public class PopulationSurveyService {
  private final PopulationSurveyRepository surveys;
  private final SurveyValidation validation;
  private final AuditService audit;
  private final AppUserRepository users;

  public PopulationSurveyService(PopulationSurveyRepository surveys, SurveyValidation validation, AuditService audit, AppUserRepository users) {
    this.surveys = surveys; this.validation = validation; this.audit = audit; this.users = users;
  }

  public Response create(Request request) {
    Request normalized = validation.normalize(request, null);
    PopulationSurvey survey = new PopulationSurvey();
    survey.createdBy = users.findByEmailIgnoreCase(SecurityContextHolder.getContext().getAuthentication().getName()).orElseThrow().getId();
    apply(survey, normalized);
    surveys.saveAndFlush(survey);
    audit.record("CREATE", "POPULATION_SURVEY", survey.id,
        Map.of("authorizations", Map.of("current", authorizationState(normalized.authorizations()))));
    return response(survey);
  }

  public Response update(UUID id, Request request, String revision) {
    PopulationSurvey survey = surveys.findForUpdate(id).orElseThrow(() -> new NotFoundException("Levantamento não encontrado."));
    br.org.rosalina.social.common.RecordRevision.requireMatch(revision, survey.updatedAt);
    Request normalized = validation.normalize(request, survey.referenceDate, survey.data.responsible());
    Map<String, String> previous = authorizationState(survey.data.authorizations());
    Map<String, String> current = authorizationState(normalized.authorizations());
    apply(survey, normalized);
    // Touch parent even for member-only changes so updatedAt advances.
    survey.updatedAt = br.org.rosalina.social.common.RecordRevision.next(survey.updatedAt);
    surveys.flush();
    audit.record("UPDATE", "POPULATION_SURVEY", id, previous.equals(current) ? Map.of()
        : Map.of("authorizations", Map.of("previous", previous, "current", current)));
    return response(survey);
  }

  @Transactional(readOnly = true)
  public Response get(UUID id) { return response(find(id)); }

  @Transactional(readOnly = true)
  public Page<ListResponse> list(String name, String cpf, Pageable pageable) {
    return surveys.search(text(name), cpf(cpf, "cpf"), pageable)
        .map(s -> new ListResponse(s.id, s.responsibleName, s.referenceDate, s.updatedAt));
  }

  private PopulationSurvey find(UUID id) {
    return surveys.findById(id).orElseThrow(() -> new NotFoundException("Levantamento não encontrado."));
  }

  // Registra a resposta, sem afirmar validade jurídica do consentimento.
  private static Map<String, String> authorizationState(Authorizations value) {
    return Map.of("imageAndSound", choice(value == null ? null : value.imageAndSound()),
        "personalData", choice(value == null ? null : value.personalData()));
  }

  private static String choice(Boolean value) {
    return value == null ? "UNSPECIFIED" : value ? "GRANTED" : "REFUSED";
  }

  private void apply(PopulationSurvey survey, Request request) {
    Map<UUID, PopulationMember> current = new HashMap<>();
    survey.members.forEach(member -> current.put(member.id, member));
    Set<UUID> submitted = new HashSet<>();
    List<PopulationMember> members = new ArrayList<>();
    for (Member m : request.members()) {
      String path = "members[" + members.size() + "].id";
      if (m.id() != null && (!current.containsKey(m.id()) || !submitted.add(m.id())))
        throw ApiException.field(path, "Identificador repetido ou que não pertence a este levantamento.");
      PopulationMember member = m.id() == null ? new PopulationMember() : current.get(m.id());
      member.survey = survey; member.position = members.size(); member.name = m.name();
      member.documentType = m.documentType(); member.documentNumber = m.documentNumber();
      member.age = m.age(); member.birthDate = m.birthDate(); member.kinship = m.kinship();
      member.income = m.income(); member.isResponsible = m.isResponsible();
      members.add(member);
    }
    survey.referenceDate = request.referenceDate();
    survey.responsibleName = request.responsible().name(); survey.responsibleCpf = request.responsible().cpf();
    survey.data = new SurveyData(request.responsible(), request.address(), request.housing(), request.workAndBenefits(),
        request.health(), request.authorizations(), request.declaration());
    survey.members.removeIf(member -> !members.contains(member));
    for (PopulationMember member : members) if (!survey.members.contains(member)) survey.members.add(member);
    survey.members.sort(Comparator.comparingInt(member -> member.position));
  }

  private Response response(PopulationSurvey survey) {
    SurveyData d = survey.data;
    List<Member> members = survey.members.stream().map(PopulationMember::response).toList();
    return new Response(survey.id, SurveyStatus.valueOf(survey.status), survey.referenceDate,
        d.responsible(), d.address(), d.housing(), d.workAndBenefits(),
        d.health(), members, d.authorizations(), d.declaration(), IncomeCalculator.calculate(members),
        survey.createdBy, survey.createdAt, survey.updatedAt, survey.updatedAt.toString());
  }
}
