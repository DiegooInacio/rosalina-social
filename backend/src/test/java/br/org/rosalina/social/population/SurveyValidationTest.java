package br.org.rosalina.social.population;

import br.org.rosalina.social.common.ApiException;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class SurveyValidationTest {
  @Test void ageUsesSurveyDateAndBirthday() {
    var birth = LocalDate.of(2000, 10, 14);
    assertEquals(25, SurveyValidation.age(null, birth, LocalDate.of(2026, 10, 13), "responsible"));
    assertEquals(26, SurveyValidation.age(null, birth, LocalDate.of(2026, 10, 14), "responsible"));
    assertEquals(50, SurveyValidation.age(50, null, LocalDate.of(2026, 10, 13), "responsible"));
    assertNull(SurveyValidation.age(null, null, LocalDate.of(2026, 10, 13), "responsible"));
  }
  @Test void incompatibleAgeAndFutureBirthAreFieldErrors() {
    assertTrue(assertThrows(ApiException.class, () -> SurveyValidation.age(10, LocalDate.of(2000, 1, 1), LocalDate.of(2026, 1, 1), "members[0]")).fields().containsKey("members[0].age"));
    assertTrue(assertThrows(ApiException.class, () -> SurveyValidation.age(null, LocalDate.of(2027, 1, 1), LocalDate.of(2026, 1, 1), "responsible")).fields().containsKey("responsible.birthDate"));
  }
}
