package br.org.rosalina.social.population;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PopulationSurveyRepository extends JpaRepository<PopulationSurvey, UUID> {
  @Query("select s from PopulationSurvey s where (:name is null or lower(s.responsibleName) like lower(concat('%', :name, '%'))) and (:cpf is null or s.responsibleCpf = :cpf)")
  Page<PopulationSurvey> search(String name, String cpf, Pageable pageable);
}
