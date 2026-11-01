package br.org.rosalina.social.common;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.springframework.http.HttpStatus;

/** Uses the existing timestamp column at PostgreSQL's microsecond precision. */
public final class RecordRevision {
  private RecordRevision() {}
  public static Instant next(Instant previous) {
    Instant now = Instant.now().truncatedTo(ChronoUnit.MICROS);
    return previous != null && !now.isAfter(previous) ? previous.plus(1, ChronoUnit.MICROS) : now;
  }
  public static void requireMatch(String expected, Instant current) {
    if (expected == null || expected.isBlank()) throw new ApiException(HttpStatus.PRECONDITION_REQUIRED,
        "Reabra a edição para carregar a versão atual do cadastro.");
    if (!expected.equals("\"" + current + "\"")) throw new ApiException(HttpStatus.CONFLICT,
        "Este cadastro mudou em outra sessão. Suas alterações foram preservadas. Reabra a edição para conferir a versão atual.");
  }
}
