package com.youthcompass.backend.dto.user;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 사용자 로그인 요청 DTO
 * 사용자 인증을 위한 로그인 정보를 담는 데이터 전송 객체
 */
@Getter
@Setter
@NoArgsConstructor
public class UserLoginRequest {

    /** 로그인 ID */
    @NotBlank(message = "로그인 ID는 필수입니다.")
    private String userLoginId;

    /** 비밀번호 */
    @NotBlank(message = "비밀번호는 필수입니다.")
    private String userPassword;
}
