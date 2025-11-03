package com.youthcompass.backend.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "user_login_id", nullable = false, unique = true, length = 50)
    private String userLoginId;

    @Column(name = "user_password", nullable = false, length = 60)
    private String userPassword;

    @Column(name = "user_name", nullable = false, length = 50)
    private String userName;

    @Column(name = "user_residence", columnDefinition = "TEXT")
    private String userResidence;

    @Column(name = "user_age")
    private Integer userAge;

    @Column(name = "user_salary", precision = 15, scale = 2)
    private BigDecimal userSalary;

    @Column(name = "user_assets", precision = 15, scale = 2)
    private BigDecimal userAssets;

    @Column(name = "user_note", columnDefinition = "TEXT")
    private String userNote;

    @Column(name = "user_agree_privacy")
    private Boolean userAgreePrivacy = false;

    @CreationTimestamp
    @Column(name = "user_created_at", updatable = false)
    private LocalDateTime userCreatedAt;

    @UpdateTimestamp
    @Column(name = "user_updated_at")
    private LocalDateTime userUpdatedAt;
}
