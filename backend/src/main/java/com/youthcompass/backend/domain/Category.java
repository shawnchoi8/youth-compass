package com.youthcompass.backend.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 카테고리 엔티티
 * FAQ 분류를 위한 카테고리 정보를 관리하는 도메인 객체
 */
@Entity
@Table(name = "categories")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "category_id")
    private Long categoryId;

    @Column(name = "category_name", nullable = false, length = 100)
    private String categoryName;

    @Column(name = "category_icon", length = 500)
    private String categoryIcon;

    @Column(name = "category_is_active")
    private Boolean categoryIsActive = true;

    @CreationTimestamp
    @Column(name = "category_created_at", updatable = false)
    private LocalDateTime categoryCreatedAt;
}
