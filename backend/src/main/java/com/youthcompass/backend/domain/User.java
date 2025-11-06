package com.youthcompass.backend.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 사용자 엔티티
 * 시스템 사용자의 정보를 관리하는 도메인 객체
 */
@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
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

    /**
     * 사용자 프로필 정보를 업데이트합니다.
     * null이 아닌 필드만 업데이트됩니다.
     *
     * @param name 이름
     * @param residence 거주지
     * @param age 나이
     * @param salary 급여
     * @param assets 자산
     * @param note 비고
     * @param agreePrivacy AI 답변 시 프로필 정보 사용 여부
     */
    public void updateProfile(String name, String residence, Integer age,
                            BigDecimal salary, BigDecimal assets, String note,
                            Boolean agreePrivacy) {
        if (name != null) {
            this.userName = name;
        }
        if (residence != null) {
            this.userResidence = residence;
        }
        if (age != null) {
            this.userAge = age;
        }
        if (salary != null) {
            this.userSalary = salary;
        }
        if (assets != null) {
            this.userAssets = assets;
        }
        if (note != null) {
            this.userNote = note;
        }
        if (agreePrivacy != null) {
            this.userAgreePrivacy = agreePrivacy;
        }
    }
}
