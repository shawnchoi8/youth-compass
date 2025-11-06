package com.youthcompass.backend.dto.user;

import com.youthcompass.backend.domain.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * 사용자 프로필 정보 DTO
 * AI 서비스로 전달할 사용자의 프로필 정보를 담는 데이터 전송 객체
 * (민감 정보 제외: ID, 로그인정보, 비밀번호 등)
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProfileDTO {

    /** 사용자 이름 */
    private String name;

    /** 거주지역 */
    private String residence;

    /** 나이 */
    private Integer age;

    /** 연봉 */
    private BigDecimal salary;

    /** 총 자산 */
    private BigDecimal assets;

    /** 참고 메시지 */
    private String note;

    /** 개인정보 동의 여부 */
    private Boolean agreePrivacy;

    /**
     * User 엔티티로부터 UserProfileDTO 생성
     * userAgreePrivacy가 false인 경우 개인정보를 null로 설정합니다.
     *
     * @param user 사용자 엔티티
     * @return 사용자 프로필 DTO
     */
    public static UserProfileDTO from(User user) {
        // AI 답변 시 프로필 정보 사용 여부 확인
        boolean useProfile = user.getUserAgreePrivacy() != null && user.getUserAgreePrivacy();

        return UserProfileDTO.builder()
                .name(user.getUserName())
                .residence(useProfile ? user.getUserResidence() : null)
                .age(useProfile ? user.getUserAge() : null)
                .salary(useProfile ? user.getUserSalary() : null)
                .assets(useProfile ? user.getUserAssets() : null)
                .note(useProfile ? user.getUserNote() : null)
                .agreePrivacy(user.getUserAgreePrivacy())
                .build();
    }
}
