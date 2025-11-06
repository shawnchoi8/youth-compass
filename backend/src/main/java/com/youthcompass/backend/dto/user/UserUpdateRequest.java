package com.youthcompass.backend.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * 사용자 정보 수정 요청 DTO
 * 사용자의 프로필 정보를 수정하기 위한 데이터 전송 객체
 */
@Getter
@Setter
@NoArgsConstructor
public class UserUpdateRequest {

    /** 사용자 이름 (필수, 최대 50자) */
    @NotBlank(message = "이름은 필수입니다.")
    @Size(max = 50, message = "이름은 50자 이내여야 합니다.")
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
}
