package br.org.rosalina.social.common;
import jakarta.servlet.http.HttpServletRequest; import org.springframework.http.*; import org.springframework.web.bind.MethodArgumentNotValidException; import org.springframework.web.bind.annotation.*; import java.time.Instant; import java.util.*;
@RestControllerAdvice public class GlobalExceptionHandler {
 record ErrorResponse(Instant timestamp,int status,String code,String message,Map<String,String> fields,String path){}
 @ExceptionHandler(ApiException.class) ResponseEntity<ErrorResponse> api(ApiException e,HttpServletRequest r){return response(e.status(),e.getMessage(),Map.of(),r);}
 @ExceptionHandler(MethodArgumentNotValidException.class) ResponseEntity<ErrorResponse> validation(MethodArgumentNotValidException e,HttpServletRequest r){Map<String,String> fields=new LinkedHashMap<>();e.getBindingResult().getFieldErrors().forEach(x->fields.put(x.getField(),x.getDefaultMessage()));return response(HttpStatus.BAD_REQUEST,"Há campos inválidos.",fields,r);}
 @ExceptionHandler(Exception.class) ResponseEntity<ErrorResponse> other(Exception e,HttpServletRequest r){return response(HttpStatus.INTERNAL_SERVER_ERROR,"Erro interno.",Map.of(),r);}
 private ResponseEntity<ErrorResponse> response(HttpStatus s,String m,Map<String,String> fields,HttpServletRequest r){return ResponseEntity.status(s).body(new ErrorResponse(Instant.now(),s.value(),s.name(),m,fields,r.getRequestURI()));}
}
