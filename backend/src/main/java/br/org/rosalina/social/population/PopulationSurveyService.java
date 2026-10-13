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
    audit.record("CREATE", "POPULATION_SURVEY", survey.id);
    return response(survey);
  }

  public Response update(UUID id, Request request) {
    PopulationSurvey survey = find(id);
    Request normalized = validation.normalize(request, survey.referenceDate);
    apply(survey, normalized);
    // Touch parent even for member-only changes so updatedAt advances.
    survey.updatedAt = java.time.Instant.now();
    surveys.flush();
    audit.record("UPDATE", "POPULATION_SURVEY", id);
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
    return new Response(survey.id, survey.referenceDate, d.responsible(), d.address(), d.housing(), d.workAndBenefits(),
        d.health(), members, d.authorizations(), d.declaration(), IncomeCalculator.calculate(members),
        survey.createdBy, survey.createdAt, survey.updatedAt);
  }
}
