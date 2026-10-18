package br.org.rosalina.social.draft;

import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.domain.Sort;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import static br.org.rosalina.social.draft.DraftDtos.*;

@RestController
@RequestMapping("/api/v1/form-drafts")
public class FormDraftController {
  private final FormDraftService service;
  public FormDraftController(FormDraftService service) { this.service = service; }

  @PostMapping
  @Operation(summary = "Criar rascunho privado de aluno ou levantamento, sem validar os campos do formulário")
  public ResponseEntity<Response> create(@Valid @RequestBody CreateRequest request) {
    Response response = service.create(request);
    return ResponseEntity.created(URI.create("/api/v1/form-drafts/" + response.id())).body(response);
  }

  @GetMapping
  @Operation(summary = "Listar somente rascunhos pendentes do usuário autenticado, sem os dados pessoais")
  public Page<Summary> list(@RequestParam(required = false) FormType formType,
      @PageableDefault(size = 20, sort = "updatedAt", direction = Sort.Direction.DESC) Pageable pageable) {
    return service.list(formType, pageable);
  }

  @GetMapping("/{id}")
  public Response get(@PathVariable UUID id) { return service.get(id); }

  @PutMapping("/{id}")
  @Operation(summary = "Substituir o estado do rascunho; versão desatualizada retorna 409")
  public Response update(@PathVariable UUID id, @Valid @RequestBody UpdateRequest request) { return service.update(id, request); }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void discard(@PathVariable UUID id, @RequestParam long version) { service.discard(id, version); }

  @PostMapping("/{id}/complete")
  @Operation(summary = "Concluir com validação completa; repetições retornam o mesmo recordId")
  public CompletionResponse complete(@PathVariable UUID id, @Valid @RequestBody CompleteRequest request) {
    return service.complete(id, request);
  }
}
