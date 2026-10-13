package br.org.rosalina.social.common;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class FieldValidationTest {
  @Test void masksNormalizeButLettersAndEmptyMasksAreInvalid() {
    assertEquals("52998224725", FieldValidation.cpf("529.982.247-25", "cpf"));
    assertEquals("85999999999", FieldValidation.phone("(85) 99999-9999", "phone"));
    assertEquals("60744390", FieldValidation.zipCode("60744-390", "zipCode"));
    assertNull(FieldValidation.numeric(" ", "nis", 20));
    for (String value : new String[]{"abc52998224725", "---", "11111111111"})
      assertThrows(ApiException.class, () -> FieldValidation.cpf(value, "cpf"));
    assertThrows(ApiException.class, () -> FieldValidation.numeric("abc123", "nis", 20));
    assertThrows(ApiException.class, () -> FieldValidation.phone("-------", "phone"));
    assertEquals("AB-123", FieldValidation.text(" AB-123 "));
  }
  @Test void falseAndUnknownDoNotPermitConditionalDetails() {
    assertThrows(ApiException.class, () -> FieldValidation.conditional(false, "Detalhe", "field"));
    assertThrows(ApiException.class, () -> FieldValidation.conditional(null, "Detalhe", "field"));
    assertDoesNotThrow(() -> FieldValidation.conditional(true, null, "field"));
    assertDoesNotThrow(() -> FieldValidation.conditional(false, " ", "field"));
  }
}
