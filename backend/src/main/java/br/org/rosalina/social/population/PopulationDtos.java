package br.org.rosalina.social.population;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class PopulationDtos {
  private PopulationDtos() {}
  public enum HousingType { PROPRIA, ALUGADA, CEDIDA, FINANCIADA }
  public enum DocumentType { RG, CPF, CIN }

  @Schema(name = "PopulationSurveyRequest")
  public record Request(
      @Schema(description = "Data de referência; padrão: data atual em America/Fortaleza") LocalDate referenceDate,
      @NotNull @Valid Responsible responsible,
      @Valid Address address, @Valid Housing housing,
      @Valid WorkAndBenefits workAndBenefits, @Valid Health health,
      @Schema(description = "Pode ser vazia. Se preenchida, deve conter exatamente um responsável.")
      @Valid List<@NotNull Member> members,
      @Valid Authorizations authorizations, @Valid Declaration declaration) {}

  @Schema(name = "PopulationResponsible")
  public record Responsible(
      @NotBlank @Size(max = 150) String name,
      @Min(0) Integer age, @Size(max = 150) String socialName,
      UUID birthSexId, UUID racialIdentityId, LocalDate birthDate,
      UUID genderIdentityId, UUID sexualOrientationId, UUID maritalStatusId,
      DocumentType documentType, @Size(max = 30) String documentNumber,
      @Size(max = 30) String cpf, @Size(max = 20) String phone,
      @Size(max = 150) String birthplace, @Size(max = 100) String nationality,
      @Size(max = 40) String nis, UUID educationId, UUID schoolTypeId,
      @Email @Size(max = 254) String email, @Size(max = 30) String voterRegistration) {}

  @Schema(name = "PopulationAddress")
  public record Address(
      @Size(max = 255) String street, @Size(max = 30) String number,
      @Size(max = 9) String zipCode, @Size(max = 120) String city,
      @Pattern(regexp = "^$|^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$",
          message = "Informe uma UF válida.") String state,
      @Size(max = 120) String neighborhood, @Size(max = 255) String complement) {}

  @Schema(name = "PopulationHousing")
  public record Housing(
      HousingType type, @Min(0) Integer roomCount,
      @Size(max = 150) String landlordName, @Size(max = 20) String landlordPhone,
      @Min(0) Integer monthsInCommunity, @Min(0) Integer monthsAtAddress,
      Boolean pipedWater, Boolean electricity, Boolean sewage, @Min(0) Integer residentCount) {}

  @Schema(name = "PopulationWorkAndBenefits")
  public record WorkAndBenefits(
      Boolean works, @Size(max = 255) String occupation,
      Boolean receivesBenefit, @Size(max = 255) String benefit,
      Boolean minhaCasaMinhaVidaRegistered) {}

  @Schema(name = "PopulationHealth")
  public record Health(
      Boolean hasDisability, @Size(max = 2000) String disabilityDescription,
      Boolean continuousMedication, @Size(max = 2000) String medications,
      Boolean medicalCertificatePresented, @Size(max = 2000) String allergies) {}

  @Schema(name = "PopulationMember")
  public record Member(
      @Schema(description = "Omitir em novos integrantes; preservar o UUID recebido ao editar.") UUID id,
      @NotBlank @Size(max = 150) String name,
      DocumentType documentType, @Size(max = 30) String documentNumber,
      @Min(0) Integer age, LocalDate birthDate, @Size(max = 100) String kinship,
      @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal income,
      boolean isResponsible) {}

  @Schema(name = "PopulationAuthorizations")
  public record Authorizations(Boolean imageAndSound, Boolean personalData) {}

  @Schema(name = "PopulationDeclaration")
  public record Declaration(
      @Size(max = 150) String location, LocalDate date,
      @Size(max = 150) String responsibleSignatureName, @Size(max = 150) String registrarSignatureName) {}

  /** Immutable section data stored as JSONB; members have independent relational identities. */
  public record SurveyData(Responsible responsible, Address address, Housing housing,
      WorkAndBenefits workAndBenefits, Health health, Authorizations authorizations, Declaration declaration) {}

  @JsonInclude(JsonInclude.Include.ALWAYS)
  @Schema(name = "PopulationFinancialSummary", accessMode = Schema.AccessMode.READ_ONLY)
  public record FinancialSummary(int memberCount, boolean incomeComplete, BigDecimal totalIncome, BigDecimal perCapitaIncome) {}

  @Schema(name = "PopulationSurveyResponse")
  public record Response(UUID id, LocalDate referenceDate, Responsible responsible, Address address,
      Housing housing, WorkAndBenefits workAndBenefits, Health health, List<Member> members,
      Authorizations authorizations, Declaration declaration, @Schema(accessMode = Schema.AccessMode.READ_ONLY) FinancialSummary financialSummary,
      UUID createdBy, Instant createdAt, Instant updatedAt) {}

  @Schema(name = "PopulationSurveyListResponse")
  public record ListResponse(UUID id, String responsibleName, LocalDate referenceDate, Instant updatedAt) {}
}
