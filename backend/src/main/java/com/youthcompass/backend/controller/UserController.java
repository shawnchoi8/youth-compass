package com.youthcompass.backend.controller;

import com.youthcompass.backend.dto.user.UserLoginRequest;
import com.youthcompass.backend.dto.user.UserRegisterRequest;
import com.youthcompass.backend.dto.user.UserUpdateRequest;
import com.youthcompass.backend.dto.user.UserResponse;
import com.youthcompass.backend.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

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
        // 회원가입 과정에서 발생한 예외를 상태 코드로 전달
        try {
            UserResponse response = userService.register(request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            throw translateIllegalArgument(e);
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.", e);
        }
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
        // 로그인 실패 원인을 상태 코드로 변환
        try {
            UserResponse response = userService.login(request);
            // TODO: JWT 토큰 생성 및 반환
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            throw translateIllegalArgument(e);
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.", e);
        }
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
        // 사용자 조회 실패 시 적절한 상태 코드 반환
        try {
            UserResponse response = userService.getUserInfo(userId);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            throw translateIllegalArgument(e);
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.", e);
        }
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
        // 프로필 수정 실패 사유를 상태 코드로 변환
        try {
            UserResponse response = userService.updateUserInfo(userId, request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            throw translateIllegalArgument(e);
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.", e);
        }
    }

    // IllegalArgumentException을 상황별 HTTP 상태 코드로 변환해 일관된 응답을 보장
    private ResponseStatusException translateIllegalArgument(IllegalArgumentException e) {
        String message = e.getMessage();
        if ("이미 존재하는 로그인 ID입니다.".equals(message)) {
            return new ResponseStatusException(HttpStatus.CONFLICT, message, e);
        }
        if ("아이디 또는 비밀번호가 일치하지 않습니다.".equals(message)) {
            return new ResponseStatusException(HttpStatus.UNAUTHORIZED, message, e);
        }
        if ("사용자를 찾을 수 없습니다.".equals(message)) {
            return new ResponseStatusException(HttpStatus.NOT_FOUND, message, e);
        }
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message, e);
    }
}
