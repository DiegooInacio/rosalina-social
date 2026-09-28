package br.org.rosalina.social.student;
import java.lang.annotation.*;
/** Documents the preferred paging defaults; Spring still accepts Pageable without it. */
@Target(ElementType.PARAMETER) @Retention(RetentionPolicy.RUNTIME)
public @interface PageableDefault { int size() default 20; String[] sort() default {}; }
