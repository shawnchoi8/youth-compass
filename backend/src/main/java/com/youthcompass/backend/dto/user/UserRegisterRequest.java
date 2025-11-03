package com.youthcompass.backend.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * 사용자 회원가입 요청 DTO
 * 새로운 사용자 계정을 생성하기 위한 정보를 담는 데이터 전송 객체
 */
@Getter
@Setter
@NoArgsConstructor
public class UserRegisterRequest {

    /** 로그인 ID (필수, 최대 50자) */
    @NotBlank(message = "로그인 ID는 필수입니다.")
    @Size(max = 50, message = "로그인 ID는 50자 이내여야 합니다.")
    private String userLoginId;

    /** 비밀번호 (필수, 8-60자) */
    @NotBlank(message = "비밀번호는 필수입니다.")
    @Size(min = 8, max = 60, message = "비밀번호는 8자 이상 60자 이내여야 합니다.")
    private String userPassword;

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

    /** 개인정보 동의 여부 */
    private Boolean userAgreePrivacy;
}
