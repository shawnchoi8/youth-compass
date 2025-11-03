package com.youthcompass.backend.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "categories")
@Getter
@Setter
@NoArgsConstructor
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
