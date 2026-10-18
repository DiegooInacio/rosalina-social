package br.org.rosalina.social.draft;

import br.org.rosalina.social.common.ApiException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.validation.Validator;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class DraftSubmissionValidator {
  private final ObjectMapper json;
  private final Validator validator;

  public DraftSubmissionValidator(ObjectMapper json, Validator validator) {
    this.json = json;
    this.validator = validator;
  }

  public <T> T read(ObjectNode submission, Class<T> type) {
    final T request;
    try {
      request = json.treeToValue(submission, type);
    } catch (JsonProcessingException error) {
      StringBuilder field = new StringBuilder();
      if (error instanceof JsonMappingException mapping) {
        for (var reference : mapping.getPath()) {
          if (reference.getFieldName() != null) {
            if (!field.isEmpty()) field.append('.');
            field.append(reference.getFieldName());
          } else if (reference.getIndex() >= 0) field.append('[').append(reference.getIndex()).append(']');
        }
      }
      throw ApiException.field(field.isEmpty() ? "submission" : field.toString(), "Valor ou formato inválido.");
    }
    Map<String, String> fields = new LinkedHashMap<>();
    validator.validate(request).forEach(violation -> fields.put(violation.getPropertyPath().toString(), violation.getMessage()));
    if (!fields.isEmpty()) throw new ApiException(HttpStatus.BAD_REQUEST, "Há campos inválidos.", fields);
    return request;
  }
}
