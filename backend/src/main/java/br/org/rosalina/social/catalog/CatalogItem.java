package br.org.rosalina.social.catalog;
import jakarta.persistence.*; import java.time.Instant; import java.util.UUID;
@Entity @Table(name="catalog_item") public class CatalogItem {
 @Id @GeneratedValue private UUID id;
 @Enumerated(EnumType.STRING) @Column(nullable=false) private CatalogCategory category;
 @Column(nullable=false) private String name;
 @Column(nullable=false) private boolean active=true;
 @Column(name="created_at",nullable=false,updatable=false) private Instant createdAt;
 @Column(name="updated_at",nullable=false) private Instant updatedAt;
 @PrePersist void create(){createdAt=Instant.now();updatedAt=createdAt;} @PreUpdate void update(){updatedAt=Instant.now();}
 public UUID getId(){return id;} public CatalogCategory getCategory(){return category;} public String getName(){return name;} public boolean isActive(){return active;}
 public void setCategory(CatalogCategory v){category=v;} public void setName(String v){name=v.trim();} public void setActive(boolean v){active=v;}
}
