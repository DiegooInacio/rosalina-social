package br.org.rosalina.social.common;

import java.time.LocalDate;
import java.time.ZoneId;

/** Shared normalization accepts documented masks, never arbitrary letters in numeric fields. */
public final class FieldValidation {
  private FieldValidation() {}
  public static LocalDate today() { return LocalDate.now(ZoneId.of("America/Fortaleza")); }
  public static String text(String value) { return value == null || value.isBlank() ? null : value.trim(); }
  public static String digits(String value) { return text(value) == null ? null : value.replaceAll("\\D", ""); }
  public static String numeric(String value, String field, int max) {
    if (text(value) == null) return null;
    String normalized = digits(value);
    if (!value.matches("[0-9.\\- /]+") || normalized.isEmpty() || normalized.length() > max)
      throw ApiException.field(field, "Informe somente dígitos ou uma máscara válida (até " + max + " dígitos).");
    return normalized;
  }
  public static String cpf(String value, String field) {
    String normalized = numeric(value, field, 11);
    if (!DocumentValidator.cpf(normalized)) throw ApiException.field(field, "Informe um CPF válido.");
    return normalized;
  }
  public static String phone(String value, String field) {
    if (text(value) == null) return null;
    String normalized = digits(value);
    if (!value.matches("[0-9() +\\-]{7,20}") || !normalized.matches("[0-9]{7,15}"))
      throw ApiException.field(field, "Informe um telefone válido.");
    return normalized;
  }
  public static String zipCode(String value, String field) {
    if (text(value) == null) return null;
    if (!value.matches("[0-9]{5}-?[0-9]{3}")) throw ApiException.field(field, "Informe um CEP válido.");
    return digits(value);
  }
  public static void conditional(Boolean enabled, Object detail, String field) {
    if (!Boolean.TRUE.equals(enabled) && detail != null && (!(detail instanceof String text) || !text.isBlank()))
      throw ApiException.field(field, "Informe este detalhe somente quando a resposta for Sim.");
  }
  public static void notFuture(LocalDate value, String field) {
    if (value != null && value.isAfter(today())) throw ApiException.field(field, "A data não pode estar no futuro.");
  }
}
