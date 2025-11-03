package com.youthcompass.backend.dto.faq;

import com.youthcompass.backend.domain.Faq;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * FAQ 정보 응답 DTO
 * 자주 묻는 질문과 답변 정보를 클라이언트에 전달하기 위한 데이터 전송 객체
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FaqResponse {

    /** FAQ ID */
    private Long faqId;

    /** 카테고리 ID */
    private Long categoryId;

    /** 카테고리 이름 */
    private String categoryName;

    /** FAQ 질문 */
    private String faqQuestion;

    /** FAQ 답변 */
    private String faqAnswer;

    /** FAQ 정렬 순서 */
    private Integer faqOrder;

    /** FAQ 상세 URL */
    private String faqDetailUrl;

    /** 생성 일시 */
    private LocalDateTime faqCreatedAt;

    /**
     * Faq 엔티티로부터 FaqResponse 객체를 생성합니다.
     * @param faq Faq 엔티티
     * @return FaqResponse 객체
     */
    public static FaqResponse from(Faq faq) {
        return new FaqResponse(
            faq.getFaqId(),
            faq.getCategory().getCategoryId(),
            faq.getCategory().getCategoryName(),
            faq.getFaqQuestion(),
            faq.getFaqAnswer(),
            faq.getFaqOrder(),
            faq.getFaqDetailUrl(),
            faq.getFaqCreatedAt()
        );
    }
}
