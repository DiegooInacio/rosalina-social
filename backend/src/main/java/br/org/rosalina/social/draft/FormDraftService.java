package br.org.rosalina.social.draft;

import br.org.rosalina.social.audit.AuditService;
import br.org.rosalina.social.common.ApiException;
import br.org.rosalina.social.common.NotFoundException;
import br.org.rosalina.social.population.PopulationDtos;
import br.org.rosalina.social.population.PopulationSurveyService;
import br.org.rosalina.social.student.StudentController;
import br.org.rosalina.social.student.StudentService;
import br.org.rosalina.social.user.AppUserRepository;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static br.org.rosalina.social.common.FieldValidation.text;
import static br.org.rosalina.social.draft.DraftDtos.*;

@Service
@Transactional
public class FormDraftService {
  private static final int MAX_DATA_BYTES = 256 * 1024;
  private final FormDraftRepository drafts;
  private final AppUserRepository users;
  private final AuditService audit;
  private final DraftSubmissionValidator validator;
  private final StudentService students;
  private final PopulationSurveyService surveys;

  public FormDraftService(FormDraftRepository drafts, AppUserRepository users, AuditService audit,
      DraftSubmissionValidator validator, StudentService students, PopulationSurveyService surveys) {
    this.drafts = drafts; this.users = users; this.audit = audit;
    this.validator = validator; this.students = students; this.surveys = surveys;
  }

  public Response create(CreateRequest request) {
    checkSize(request.data(), "data");
    FormDraft draft = new FormDraft();
    draft.ownerId = owner();
    draft.formType = request.formType();
    draft.title = text(request.title());
    draft.data = request.data().deepCopy();
    drafts.saveAndFlush(draft);
    audit.record("CREATE_DRAFT", "FORM_DRAFT", draft.id);
    return response(draft);
  }

  @Transactional(readOnly = true)
  public Response get(UUID id) {
    return response(drafts.findByIdAndOwnerId(id, owner()).orElseThrow(FormDraftService::notFound));
  }

  @Transactional(readOnly = true)
  public Page<Summary> list(FormType formType, Pageable pageable) {
    Set<String> allowedSort = Set.of("id", "title", "formType", "createdAt", "updatedAt");
    if (pageable.getSort().stream().anyMatch(order -> !allowedSort.contains(order.getProperty())))
      throw ApiException.field("sort", "Ordenação inválida para rascunhos.");
    Pageable limited = PageRequest.of(pageable.getPageNumber(), Math.min(pageable.getPageSize(), 100), pageable.getSort());
    return drafts.searchOwned(owner(), Status.DRAFT, formType, limited)
        .map(d -> new Summary(d.id, d.formType, d.title, d.version, d.createdAt, d.updatedAt));
  }

  public Response update(UUID id, UpdateRequest request) {
    FormDraft draft = locked(id);
    requirePending(draft);
    checkVersion(draft, request.version());
    checkSize(request.data(), "data");
    draft.title = text(request.title());
    draft.data = request.data().deepCopy();
    // Mesmo que o conteúdo seja igual, cada gravação confirmada avança a versão.
    draft.updatedAt = Instant.now();
    drafts.flush();
    audit.record("UPDATE_DRAFT", "FORM_DRAFT", draft.id);
    return response(draft);
  }

  public void discard(UUID id, long version) {
    FormDraft draft = locked(id);
    requirePending(draft);
    checkVersion(draft, version);
    drafts.delete(draft);
    audit.record("DISCARD_DRAFT", "FORM_DRAFT", id);
  }

  public CompletionResponse complete(UUID id, CompleteRequest request) {
    FormDraft draft = locked(id);
    // Repetir a conclusão após perda da resposta não cria um segundo cadastro.
    if (draft.status == Status.COMPLETED) return completion(draft);
    checkVersion(draft, request.version());
    checkSize(request.submission(), "submission");
    UUID recordId = switch (draft.formType) {
      case STUDENT -> students.create(validator.read(request.submission(), StudentController.Request.class)).getId();
      case POPULATION_SURVEY -> surveys.create(validator.read(request.submission(), PopulationDtos.Request.class)).id();
    };
    draft.status = Status.COMPLETED;
    draft.recordId = recordId;
    // Mantém somente o comprovante da conclusão, sem duplicar dados pessoais.
    draft.data = draft.data.objectNode();
    draft.title = null;
    drafts.flush();
    audit.record("COMPLETE_DRAFT", "FORM_DRAFT", id);
    return completion(draft);
  }

  private UUID owner() {
    var authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication == null || !authentication.isAuthenticated())
      throw new ApiException(HttpStatus.UNAUTHORIZED, "Autenticação necessária.");
    return users.findByEmailIgnoreCase(authentication.getName()).filter(user -> user.isActive())
        .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Usuário não encontrado ou inativo.")).getId();
  }

  private FormDraft locked(UUID id) {
    return drafts.findOwnedForUpdate(id, owner()).orElseThrow(FormDraftService::notFound);
  }

  private static NotFoundException notFound() { return new NotFoundException("Rascunho não encontrado."); }

  private static void requirePending(FormDraft draft) {
    if (draft.status != Status.DRAFT)
      throw new ApiException(HttpStatus.CONFLICT, "Este rascunho já foi concluído.");
  }

  private static void checkVersion(FormDraft draft, long version) {
    if (version < 0) throw ApiException.field("version", "Informe uma versão não negativa.");
    if (version != draft.version)
      throw new ApiException(HttpStatus.CONFLICT, "O rascunho foi alterado. Recarregue a versão atual antes de salvar.");
  }

  private static void checkSize(ObjectNode data, String field) {
    if (data.toString().getBytes(StandardCharsets.UTF_8).length > MAX_DATA_BYTES)
      throw ApiException.field(field, "O conteúdo deve ter no máximo 256 KiB.");
  }

  private static Response response(FormDraft d) {
    return new Response(d.id, d.formType, d.status, d.title, d.data.deepCopy(), d.recordId, d.version, d.createdAt, d.updatedAt);
  }

  private static CompletionResponse completion(FormDraft d) {
    return new CompletionResponse(d.id, d.formType, d.recordId);
  }
}
