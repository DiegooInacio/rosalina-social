package br.org.rosalina.social.student;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface StudentRepository extends JpaRepository<Student, UUID> {
  @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from Student s where s.id = :id")
  java.util.Optional<Student> findForUpdate(UUID id);

  boolean existsByCpf(String cpf);

  @EntityGraph(attributePaths = {"activity", "relatives", "relatives.occupation", "relatives.education", "socioeconomicProfile"})
  Optional<Student> findWithDetailsById(UUID id);

  // O cast mantém o parâmetro textual mesmo quando o filtro é omitido.
  // A atividade deve estar carregada antes de encerrar a transação da listagem.
  @EntityGraph(attributePaths = "activity")
  @Query("select s from Student s where (:name is null or lower(s.name) like lower(concat('%', cast(:name as string), '%'))) and (:cpf is null or s.cpf = :cpf) and (:status is null or s.status = :status)")
  Page<Student> search(String name, String cpf, StudentStatus status, Pageable pageable);
}
