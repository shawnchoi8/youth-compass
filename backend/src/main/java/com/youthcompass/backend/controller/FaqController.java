package com.youthcompass.backend.controller;

import com.youthcompass.backend.dto.faq.CategoryResponse;
import com.youthcompass.backend.dto.faq.FaqResponse;
import com.youthcompass.backend.service.FaqService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

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
        // FAQ 데이터 조회 실패 시 사용자에게 명확한 상태 코드를 전달
        try {
            List<CategoryResponse> categories = faqService.getActiveCategories();
            return ResponseEntity.ok(categories);
        } catch (IllegalArgumentException e) {
            throw translateIllegalArgument(e);
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "FAQ 카테고리 조회 중 오류가 발생했습니다.", e);
        }
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
        // 카테고리별 FAQ 조회 실패 상황을 상태 코드로 변환
        try {
            List<FaqResponse> faqs = faqService.getFaqsByCategory(categoryId);
            return ResponseEntity.ok(faqs);
        } catch (IllegalArgumentException e) {
            throw translateIllegalArgument(e);
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "FAQ 조회 중 오류가 발생했습니다.", e);
        }
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
        // 검색 중 예외 발생 시 HTTP 상태 코드로 응답
        try {
            List<FaqResponse> faqs = faqService.searchFaqs(keyword);
            return ResponseEntity.ok(faqs);
        } catch (IllegalArgumentException e) {
            throw translateIllegalArgument(e);
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "FAQ 검색 중 오류가 발생했습니다.", e);
        }
    }

    /**
     * 모든 FAQ 조회
     * 시스템에 등록된 모든 FAQ를 반환합니다.
     *
     * @return 전체 FAQ 목록 (HTTP 200)
     */
    @GetMapping
    public ResponseEntity<List<FaqResponse>> getAllFaqs() {
        // 전체 FAQ 조회 실패 시 일관된 에러 응답 반환
        try {
            List<FaqResponse> faqs = faqService.getAllFaqs();
            return ResponseEntity.ok(faqs);
        } catch (IllegalArgumentException e) {
            throw translateIllegalArgument(e);
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "FAQ 전체 목록 조회 중 오류가 발생했습니다.", e);
        }
    }

    // FAQ 관련 IllegalArgumentException을 HTTP 상태 코드로 변환
    private ResponseStatusException translateIllegalArgument(IllegalArgumentException e) {
        String message = e.getMessage();
        if (message != null && message.contains("찾을 수 없습니다")) {
            return new ResponseStatusException(HttpStatus.NOT_FOUND, message, e);
        }
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message, e);
    }
}
