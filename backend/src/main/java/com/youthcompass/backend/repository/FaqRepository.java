package com.youthcompass.backend.repository;

import com.youthcompass.backend.domain.Faq;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FaqRepository extends JpaRepository<Faq, Long> {

    /**
     * 카테고리별 FAQ 조회 (순서대로 정렬)
     */
    List<Faq> findByCategoryCategoryIdOrderByFaqOrderAsc(Long categoryId);

    /**
     * 질문 내용으로 검색 (LIKE 검색)
     */
    List<Faq> findByFaqQuestionContainingOrFaqAnswerContaining(String questionKeyword, String answerKeyword);
}
