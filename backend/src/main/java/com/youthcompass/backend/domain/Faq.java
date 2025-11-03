package com.youthcompass.backend.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * FAQ 엔티티
 * 자주 묻는 질문과 답변 정보를 관리하는 도메인 객체
 */
@Entity
@Table(name = "faq")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Faq {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "faq_id")
    private Long faqId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(name = "faq_question", nullable = false, length = 255)
    private String faqQuestion;

    @Column(name = "faq_answer", nullable = false, columnDefinition = "TEXT")
    private String faqAnswer;

    @Column(name = "faq_order")
    private Integer faqOrder = 0;

    @Column(name = "faq_detail_url", length = 500)
    private String faqDetailUrl;

    @CreationTimestamp
    @Column(name = "faq_created_at", updatable = false)
    private LocalDateTime faqCreatedAt;
}
