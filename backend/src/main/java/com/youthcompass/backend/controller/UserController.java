package com.youthcompass.backend.controller;

import com.youthcompass.backend.dto.user.UserLoginRequest;
import com.youthcompass.backend.dto.user.UserRegisterRequest;
import com.youthcompass.backend.dto.user.UserUpdateRequest;
import com.youthcompass.backend.dto.user.UserResponse;
import com.youthcompass.backend.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 사용자 관리 REST API Controller
 * 회원가입, 로그인, 사용자 정보 조회 및 수정 관련 엔드포인트를 제공합니다.
 */
@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * 회원가입
     * 새로운 사용자 계정을 생성합니다.
     *
     * @param request 회원가입 요청 데이터 (로그인ID, 비밀번호, 이름 등)
     * @return 생성된 사용자 정보 (HTTP 200)
     */
    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody UserRegisterRequest request) {
        UserResponse response = userService.register(request);
        return ResponseEntity.ok(response);
    }

    /**
     * 로그인
     * 사용자 인증을 수행하고 사용자 정보를 반환합니다.
     *
     * @param request 로그인 요청 데이터 (아이디, 비밀번호)
     * @return 인증된 사용자 정보 (HTTP 200)
     */
    @PostMapping("/login")
    public ResponseEntity<UserResponse> login(@Valid @RequestBody UserLoginRequest request) {
        UserResponse response = userService.login(request);
        // TODO: JWT 토큰 생성 및 반환
        return ResponseEntity.ok(response);
    }

    /**
     * 사용자 정보 조회
     * 특정 사용자의 상세 정보를 조회합니다.
     *
     * @param userId 조회할 사용자 ID (경로 변수)
     * @return 사용자 정보 (HTTP 200)
     */
    @GetMapping("/{userId}")
    public ResponseEntity<UserResponse> getUserInfo(@PathVariable Long userId) {
        UserResponse response = userService.getUserInfo(userId);
        return ResponseEntity.ok(response);
    }

    /**
     * 사용자 정보 수정
     * 사용자의 프로필 정보를 업데이트합니다.
     *
     * @param userId 수정할 사용자 ID (경로 변수)
     * @param request 수정할 사용자 정보 (null이 아닌 필드만 업데이트)
     * @return 수정된 사용자 정보 (HTTP 200)
     */
    @PutMapping("/{userId}")
    public ResponseEntity<UserResponse> updateUserInfo(
            @PathVariable Long userId,
            @Valid @RequestBody UserUpdateRequest request
    ) {
        UserResponse response = userService.updateUserInfo(userId, request);
        return ResponseEntity.ok(response);
    }
}
