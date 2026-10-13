package br.org.rosalina.social.population;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

public final class IncomeCalculator {
  private IncomeCalculator() {}
  public static PopulationDtos.FinancialSummary calculate(List<PopulationDtos.Member> members) {
    int count = members.size();
    if (count == 0 || members.stream().anyMatch(member -> member.income() == null))
      return new PopulationDtos.FinancialSummary(count, false, null, null);
    BigDecimal total = members.stream().map(PopulationDtos.Member::income).reduce(BigDecimal.ZERO, BigDecimal::add);
    return new PopulationDtos.FinancialSummary(count, true, total.setScale(2), total.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP));
  }
}
