package br.org.rosalina.social.population;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PopulationSurveyRepository extends JpaRepository<PopulationSurvey, UUID> {
  @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from PopulationSurvey s where s.id = :id")
  java.util.Optional<PopulationSurvey> findForUpdate(UUID id);

  @Query("select s from PopulationSurvey s where (:name is null or lower(s.responsibleName) like lower(concat('%', cast(:name as string), '%'))) and (:cpf is null or s.responsibleCpf = :cpf)")
  Page<PopulationSurvey> search(String name, String cpf, Pageable pageable);
}
