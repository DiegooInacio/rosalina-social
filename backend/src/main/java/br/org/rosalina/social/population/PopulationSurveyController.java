package br.org.rosalina.social.population;

import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import static br.org.rosalina.social.population.PopulationDtos.*;

@io.swagger.v3.oas.annotations.responses.ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Campos ou formatos inválidos; veja fields para os caminhos"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Acesso não autorizado"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Levantamento não encontrado")
})
@RestController
@RequestMapping("/api/v1/population-surveys")
public class PopulationSurveyController {
  private final PopulationSurveyService service;
  public PopulationSurveyController(PopulationSurveyService service) { this.service = service; }

  @PostMapping @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "Criar levantamento populacional")
  public Response create(@Valid @RequestBody Request request) { return service.create(request); }

  @PutMapping("/{id}")
  @Operation(summary = "Substituir levantamento; integrantes omitidos são removidos")
  public Response update(@PathVariable UUID id, @Valid @RequestBody Request request) { return service.update(id, request); }

  @GetMapping("/{id}")
  public Response get(@PathVariable UUID id) { return service.get(id); }

  @GetMapping
  public Page<ListResponse> list(@RequestParam(required = false) String name, @RequestParam(required = false) String cpf,
      @PageableDefault(size = 20, sort = "responsibleName") Pageable pageable) { return service.list(name, cpf, pageable); }
}
