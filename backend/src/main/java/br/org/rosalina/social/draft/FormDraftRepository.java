package br.org.rosalina.social.draft;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;

public interface FormDraftRepository extends JpaRepository<FormDraft, UUID> {
  Optional<FormDraft> findByIdAndOwnerId(UUID id, UUID ownerId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select d from FormDraft d where d.id = :id and d.ownerId = :ownerId")
  Optional<FormDraft> findOwnedForUpdate(UUID id, UUID ownerId);

  @Query("select d from FormDraft d where d.ownerId = :ownerId and d.status = :status and (:formType is null or d.formType = :formType)")
  Page<FormDraft> searchOwned(UUID ownerId, DraftDtos.Status status, DraftDtos.FormType formType, Pageable pageable);
}
