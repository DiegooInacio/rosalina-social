package br.org.rosalina.social.population;

import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class IncomeCalculatorTest {
  private PopulationDtos.Member member(String income) {
    return new PopulationDtos.Member(null, "Pessoa", null, null, null, null, null,
        income == null ? null : new BigDecimal(income), false);
  }
  @Test void emptyCompositionDoesNotDivideByZero() {
    var result = IncomeCalculator.calculate(List.of());
    assertEquals(0, result.memberCount()); assertFalse(result.incomeComplete());
    assertNull(result.totalIncome()); assertNull(result.perCapitaIncome());
  }
  @Test void unknownIncomeIsNotZero() {
    var result = IncomeCalculator.calculate(List.of(member("100.00"), member(null)));
    assertEquals(2, result.memberCount()); assertFalse(result.incomeComplete());
    assertNull(result.totalIncome()); assertNull(result.perCapitaIncome());
  }
  @Test void zeroAndHalfUpRounding() {
    var result = IncomeCalculator.calculate(List.of(member("1000.10"), member("0"), member("0")));
    assertTrue(result.incomeComplete()); assertEquals(new BigDecimal("1000.10"), result.totalIncome());
    assertEquals(new BigDecimal("333.37"), result.perCapitaIncome());
    assertEquals(new BigDecimal("0.00"), IncomeCalculator.calculate(List.of(member("0"))).perCapitaIncome());
  }
}
