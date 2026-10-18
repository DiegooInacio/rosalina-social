package br.org.rosalina.social.draft;

import com.fasterxml.jackson.databind.node.ObjectNode;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.UUID;

public final class DraftDtos {
  private DraftDtos() {}

  public enum FormType { STUDENT, POPULATION_SURVEY }
  public enum Status { DRAFT, COMPLETED }

  @Schema(name = "FormDraftCreateRequest")
  public record CreateRequest(
      @NotNull FormType formType,
      @Size(max = 150) String title,
      @NotNull @Schema(description = "Estado bruto do formulário, inclusive campos incompletos. Objeto JSON de até 256 KiB.") ObjectNode data) {}

  @Schema(name = "FormDraftUpdateRequest")
  public record UpdateRequest(
      @NotNull @Min(0) Long version,
      @Size(max = 150) String title,
      @NotNull ObjectNode data) {}

  @Schema(name = "FormDraftCompleteRequest")
  public record CompleteRequest(
      @NotNull @Min(0) Long version,
      @NotNull @Schema(description = "Payload final no formato StudentRequest ou PopulationSurveyRequest, conforme formType. Não é o estado bruto de data.") ObjectNode submission) {}

  @Schema(name = "FormDraftResponse")
  public record Response(UUID id, FormType formType, Status status, String title, ObjectNode data,
      UUID recordId, long version, Instant createdAt, Instant updatedAt) {}

  @Schema(name = "FormDraftSummary")
  public record Summary(UUID id, FormType formType, String title, long version, Instant createdAt, Instant updatedAt) {}

  @Schema(name = "FormDraftCompletionResponse")
  public record CompletionResponse(UUID draftId, FormType formType, UUID recordId) {}
}
