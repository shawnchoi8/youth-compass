package com.youthcompass.backend.service;

import com.youthcompass.backend.domain.Category;
import com.youthcompass.backend.domain.Faq;
import com.youthcompass.backend.dto.faq.CategoryResponse;
import com.youthcompass.backend.dto.faq.FaqResponse;
import com.youthcompass.backend.repository.CategoryRepository;
import com.youthcompass.backend.repository.FaqRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * FAQ 관리 서비스
 * FAQ 및 카테고리 조회, 검색 기능을 제공합니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FaqService {

    private final FaqRepository faqRepository;
    private final CategoryRepository categoryRepository;

    /**
     * 모든 활성화된 카테고리 조회
     * 현재 활성화된 모든 FAQ 카테고리를 조회합니다.
     *
     * @return 활성화된 카테고리 목록
     */
    public List<CategoryResponse> getActiveCategories() {
        List<Category> categories = categoryRepository.findByCategoryIsActiveTrue();

        return categories.stream()
            .map(CategoryResponse::from)
            .collect(Collectors.toList());
    }

    /**
     * 특정 카테고리의 FAQ 목록 조회
     * 지정된 카테고리에 속한 모든 FAQ를 정렬 순서대로 조회합니다.
     *
     * @param categoryId 카테고리 ID
     * @return FAQ 목록 (정렬 순서)
     */
    public List<FaqResponse> getFaqsByCategory(Long categoryId) {
        List<Faq> faqs = faqRepository.findByCategoryCategoryIdOrderByFaqOrderAsc(categoryId);

        return faqs.stream()
            .map(FaqResponse::from)
            .collect(Collectors.toList());
    }

    /**
     * FAQ 검색
     * 질문 또는 답변에서 키워드를 검색합니다.
     *
     * @param keyword 검색할 키워드
     * @return 검색 결과 FAQ 목록
     */
    public List<FaqResponse> searchFaqs(String keyword) {
        List<Faq> faqs = faqRepository.findByFaqQuestionContainingOrFaqAnswerContaining(keyword, keyword);

        return faqs.stream()
            .map(FaqResponse::from)
            .collect(Collectors.toList());
    }

    /**
     * 모든 FAQ 조회
     * 시스템에 등록된 모든 FAQ를 조회합니다.
     *
     * @return 전체 FAQ 목록
     */
    public List<FaqResponse> getAllFaqs() {
        List<Faq> faqs = faqRepository.findAll();

        return faqs.stream()
            .map(FaqResponse::from)
            .collect(Collectors.toList());
    }
}
