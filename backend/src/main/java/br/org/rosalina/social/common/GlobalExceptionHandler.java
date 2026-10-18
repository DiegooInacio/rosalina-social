package br.org.rosalina.social.common;
import jakarta.servlet.http.HttpServletRequest; import org.springframework.http.*; import org.springframework.web.bind.MethodArgumentNotValidException; import org.springframework.web.bind.annotation.*; import java.time.Instant; import java.util.*;
@RestControllerAdvice public class GlobalExceptionHandler {
 record ErrorResponse(Instant timestamp,int status,String code,String message,Map<String,String> fields,String path){}
 @ExceptionHandler(ApiException.class) ResponseEntity<ErrorResponse> api(ApiException e,HttpServletRequest r){return response(e.status(),e.getMessage(),e.fields(),r);}
 @ExceptionHandler(MethodArgumentNotValidException.class) ResponseEntity<ErrorResponse> validation(MethodArgumentNotValidException e,HttpServletRequest r){Map<String,String> fields=new LinkedHashMap<>();e.getBindingResult().getFieldErrors().forEach(x->fields.put(x.getField(),x.getDefaultMessage()));return response(HttpStatus.BAD_REQUEST,"Há campos inválidos.",fields,r);}
 @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
 ResponseEntity<ErrorResponse> unreadable(org.springframework.http.converter.HttpMessageNotReadableException e,HttpServletRequest r){
   Map<String,String> fields=new LinkedHashMap<>();
   Throwable cause=e.getCause();
   while(cause!=null&&!(cause instanceof com.fasterxml.jackson.databind.JsonMappingException))cause=cause.getCause();
   if(cause instanceof com.fasterxml.jackson.databind.JsonMappingException mapping){
     StringBuilder path=new StringBuilder();
     for(var reference:mapping.getPath()){
       if(reference.getFieldName()!=null){if(!path.isEmpty())path.append('.');path.append(reference.getFieldName());}
       else if(reference.getIndex()>=0)path.append('[').append(reference.getIndex()).append(']');
     }
     if(!path.isEmpty())fields.put(path.toString(),"Valor ou formato inválido.");
   }
   return response(HttpStatus.BAD_REQUEST,"JSON, data ou opção inválida.",fields,r);
 }
 @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
 ResponseEntity<ErrorResponse> typeMismatch(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException e,HttpServletRequest r){return response(HttpStatus.BAD_REQUEST,"Parâmetro inválido.",Map.of(e.getName(),"Valor inválido."),r);}
 @ExceptionHandler(org.springframework.web.bind.MissingServletRequestParameterException.class)
 ResponseEntity<ErrorResponse> missingParameter(org.springframework.web.bind.MissingServletRequestParameterException e,HttpServletRequest r){return response(HttpStatus.BAD_REQUEST,"Parâmetro obrigatório ausente.",Map.of(e.getParameterName(),"Informe este parâmetro."),r);}
 @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
 ResponseEntity<ErrorResponse> conflict(org.springframework.dao.DataIntegrityViolationException e,HttpServletRequest r){return response(HttpStatus.CONFLICT,"Dados conflitantes com um cadastro existente.",Map.of(),r);}
 @ExceptionHandler(Exception.class) ResponseEntity<ErrorResponse> other(Exception e,HttpServletRequest r){return response(HttpStatus.INTERNAL_SERVER_ERROR,"Erro interno.",Map.of(),r);}
 private ResponseEntity<ErrorResponse> response(HttpStatus s,String m,Map<String,String> fields,HttpServletRequest r){return ResponseEntity.status(s).body(new ErrorResponse(Instant.now(),s.value(),s.name(),m,fields,r.getRequestURI()));}
}
