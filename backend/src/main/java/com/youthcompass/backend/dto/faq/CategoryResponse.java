package com.youthcompass.backend.dto.faq;

import com.youthcompass.backend.domain.Category;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 카테고리 정보 응답 DTO
 * FAQ 카테고리 정보를 클라이언트에 전달하기 위한 데이터 전송 객체
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CategoryResponse {

    /** 카테고리 ID */
    private Long categoryId;

    /** 카테고리 이름 */
    private String categoryName;

    /** 카테고리 아이콘 */
    private String categoryIcon;

    /** 카테고리 활성화 여부 */
    private Boolean categoryIsActive;

    /** 생성 일시 */
    private LocalDateTime categoryCreatedAt;

    /**
     * Category 엔티티로부터 CategoryResponse 객체를 생성합니다.
     * @param category Category 엔티티
     * @return CategoryResponse 객체
     */
    public static CategoryResponse from(Category category) {
        return new CategoryResponse(
            category.getCategoryId(),
            category.getCategoryName(),
            category.getCategoryIcon(),
            category.getCategoryIsActive(),
            category.getCategoryCreatedAt()
        );
    }
}
