package br.org.rosalina.social.common;

import java.nio.charset.StandardCharsets;

public final class PasswordValidation {
  private PasswordValidation() {}

  public static boolean fitsBcrypt(String password) {
    return password != null && password.getBytes(StandardCharsets.UTF_8).length <= 72;
  }

  public static void validateNew(String password, String field) {
    if (password == null || password.isBlank() || password.length() < 8 || password.length() > 100)
      throw ApiException.field(field, "A senha deve ter de 8 a 100 caracteres.");
    if (!fitsBcrypt(password))
      throw ApiException.field(field, "A senha deve ocupar no máximo 72 bytes em UTF-8.");
  }
}
