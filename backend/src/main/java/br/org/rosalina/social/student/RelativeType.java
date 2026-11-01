package br.org.rosalina.social.student;

public enum RelativeType {
  PAI, MAE, RESPONSAVEL;

  public int priority() {
    return switch (this) { case MAE -> 0; case PAI -> 1; case RESPONSAVEL -> 2; };
  }
}
