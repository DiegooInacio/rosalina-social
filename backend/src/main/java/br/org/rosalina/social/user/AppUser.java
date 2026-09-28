package br.org.rosalina.social.user;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name = "app_user")
public class AppUser {
 @Id @GeneratedValue private UUID id;
 @Column(nullable=false) private String name;
 @Column(nullable=false, unique=true) private String email;
 @Column(name="password_hash", nullable=false) private String passwordHash;
 @Enumerated(EnumType.STRING) @Column(nullable=false) private Role role;
 @Column(nullable=false) private boolean active = true;
 @Column(name="created_at", nullable=false, updatable=false) private Instant createdAt;
 @Column(name="updated_at", nullable=false) private Instant updatedAt;
 @PrePersist void create(){ createdAt=Instant.now(); updatedAt=createdAt; }
 @PreUpdate void update(){ updatedAt=Instant.now(); }
 public UUID getId(){return id;} public String getName(){return name;} public String getEmail(){return email;} public String getPasswordHash(){return passwordHash;} public Role getRole(){return role;} public boolean isActive(){return active;}
 public void setName(String v){name=v;} public void setEmail(String v){email=v.toLowerCase();} public void setPasswordHash(String v){passwordHash=v;} public void setRole(Role v){role=v;} public void setActive(boolean v){active=v;}
}
