package com.youthcompass.backend.dto.user;

import com.youthcompass.backend.domain.User;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 사용자 정보 응답 DTO
 * 사용자 정보를 클라이언트에 전달하기 위한 데이터 전송 객체
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {

    /** 사용자 ID */
    private Long userId;

    /** 로그인 ID */
    private String userLoginId;

    /** 사용자 이름 */
    private String userName;

    /** 거주지 */
    private String userResidence;

    /** 나이 */
    private Integer userAge;

    /** 급여 */
    private BigDecimal userSalary;

    /** 자산 */
    private BigDecimal userAssets;

    /** 비고 */
    private String userNote;

    /** 개인정보 동의 여부 */
    private Boolean userAgreePrivacy;

    /** 생성 일시 */
    private LocalDateTime userCreatedAt;

    /** 수정 일시 */
    private LocalDateTime userUpdatedAt;

    /**
     * User 엔티티로부터 UserResponse 객체를 생성합니다.
     * @param user User 엔티티
     * @return UserResponse 객체
     */
    public static UserResponse from(User user) {
        return new UserResponse(
            user.getUserId(),
            user.getUserLoginId(),
            user.getUserName(),
            user.getUserResidence(),
            user.getUserAge(),
            user.getUserSalary(),
            user.getUserAssets(),
            user.getUserNote(),
            user.getUserAgreePrivacy(),
            user.getUserCreatedAt(),
            user.getUserUpdatedAt()
        );
    }
}
