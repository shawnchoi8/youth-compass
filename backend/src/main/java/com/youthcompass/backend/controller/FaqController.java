package com.youthcompass.backend.controller;

import com.youthcompass.backend.dto.faq.CategoryResponse;
import com.youthcompass.backend.dto.faq.FaqResponse;
import com.youthcompass.backend.service.FaqService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * FAQ 관리 REST API Controller
 * FAQ 및 카테고리 조회, 검색 관련 엔드포인트를 제공합니다.
 */
@RestController
@RequestMapping("/faq")
@RequiredArgsConstructor
public class FaqController {

    private final FaqService faqService;

    /**
     * 모든 활성화된 카테고리 조회
     * 현재 활성화된 모든 FAQ 카테고리 목록을 반환합니다.
     *
     * @return 활성화된 카테고리 목록 (HTTP 200)
     */
    @GetMapping("/categories")
    public ResponseEntity<List<CategoryResponse>> getActiveCategories() {
        List<CategoryResponse> categories = faqService.getActiveCategories();
        return ResponseEntity.ok(categories);
    }

    /**
     * 특정 카테고리의 FAQ 목록 조회
     * 지정된 카테고리에 속한 모든 FAQ를 정렬 순서대로 반환합니다.
     *
     * @param categoryId 카테고리 ID (경로 변수)
     * @return FAQ 목록 (HTTP 200)
     */
    @GetMapping("/categories/{categoryId}")
    public ResponseEntity<List<FaqResponse>> getFaqsByCategory(@PathVariable Long categoryId) {
        List<FaqResponse> faqs = faqService.getFaqsByCategory(categoryId);
        return ResponseEntity.ok(faqs);
    }

    /**
     * FAQ 검색
     * 질문 또는 답변에서 키워드를 검색합니다.
     *
     * @param keyword 검색할 키워드 (쿼리 파라미터)
     * @return 검색 결과 FAQ 목록 (HTTP 200)
     */
    @GetMapping("/search")
    public ResponseEntity<List<FaqResponse>> searchFaqs(@RequestParam String keyword) {
        List<FaqResponse> faqs = faqService.searchFaqs(keyword);
        return ResponseEntity.ok(faqs);
    }

    /**
     * 모든 FAQ 조회
     * 시스템에 등록된 모든 FAQ를 반환합니다.
     *
     * @return 전체 FAQ 목록 (HTTP 200)
     */
    @GetMapping
    public ResponseEntity<List<FaqResponse>> getAllFaqs() {
        List<FaqResponse> faqs = faqService.getAllFaqs();
        return ResponseEntity.ok(faqs);
    }
}
