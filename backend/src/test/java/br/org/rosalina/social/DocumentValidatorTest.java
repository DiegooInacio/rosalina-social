package br.org.rosalina.social;
import br.org.rosalina.social.common.DocumentValidator; import org.junit.jupiter.api.Test; import static org.junit.jupiter.api.Assertions.*;
class DocumentValidatorTest {
 @Test void acceptsValidCpfAndBlank(){assertTrue(DocumentValidator.cpf("529.982.247-25"));assertTrue(DocumentValidator.cpf(null));}
 @Test void rejectsInvalidCpf(){assertFalse(DocumentValidator.cpf("111.111.111-11"));assertFalse(DocumentValidator.cpf("529.982.247-24"));}
}
