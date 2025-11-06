package com.youthcompass.backend.service;

import com.youthcompass.backend.domain.User;
import com.youthcompass.backend.dto.user.UserRegisterRequest;
import com.youthcompass.backend.dto.user.UserUpdateRequest;
import com.youthcompass.backend.dto.user.UserLoginRequest;
import com.youthcompass.backend.dto.user.UserResponse;
import com.youthcompass.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DataAccessException;

/**
 * 사용자 관리 서비스
 * 회원가입, 로그인, 사용자 정보 조회 및 수정 기능을 제공합니다.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    // TODO: PasswordEncoder 추가 예정

    /**
     * 회원가입
     * 새로운 사용자 계정을 생성합니다.
     *
     * @param request 회원가입 요청 정보
     * @return 생성된 사용자 정보
     * @throws IllegalArgumentException 로그인 ID가 이미 존재하는 경우
     */
    @Transactional
    public UserResponse register(UserRegisterRequest request) {
        // 로그인 ID 중복 체크
        if (userRepository.existsByUserLoginId(request.getUserLoginId())) {
            throw new IllegalArgumentException("이미 존재하는 로그인 ID입니다.");
        }

        // TODO: 비밀번호 암호화 (PasswordEncoder 사용)
        User user = User.builder()
                .userLoginId(request.getUserLoginId())
                .userPassword(request.getUserPassword())
                .userName(request.getUserName())
                .userResidence(request.getUserResidence())
                .userAge(request.getUserAge())
                .userSalary(request.getUserSalary())
                .userAssets(request.getUserAssets())
                .userNote(request.getUserNote())
                .userAgreePrivacy(request.getUserAgreePrivacy())
                .build();

        try {
            User savedUser = userRepository.save(user);
            return UserResponse.from(savedUser);
        } catch (DataAccessException e) {
            log.error("회원가입 저장 실패 loginId={}: {}", request.getUserLoginId(), e.getMessage(), e);
            throw new RuntimeException("회원 정보를 저장하는 중 오류가 발생했습니다.", e);
        }
    }

    /**
     * 로그인
     * 사용자 인증을 수행하고 사용자 정보를 반환합니다.
     *
     * @param request 로그인 요청 정보 (아이디, 비밀번호)
     * @return 인증된 사용자 정보
     * @throws IllegalArgumentException 아이디 또는 비밀번호가 일치하지 않는 경우
     */
    public UserResponse login(UserLoginRequest request) {
        User user = userRepository.findByUserLoginId(request.getUserLoginId())
            .orElseThrow(() -> new IllegalArgumentException("아이디 또는 비밀번호가 일치하지 않습니다."));

        // TODO: 비밀번호 검증 (PasswordEncoder 사용)
        if (!user.getUserPassword().equals(request.getUserPassword())) {
            throw new IllegalArgumentException("아이디 또는 비밀번호가 일치하지 않습니다.");
        }

        // TODO: JWT 토큰 생성 및 반환

        return UserResponse.from(user);
    }

    /**
     * 사용자 정보 조회
     * 특정 사용자의 정보를 조회합니다.
     *
     * @param userId 조회할 사용자 ID
     * @return 사용자 정보
     * @throws IllegalArgumentException 사용자를 찾을 수 없는 경우
     */
    public UserResponse getUserInfo(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        return UserResponse.from(user);
    }

    /**
     * 사용자 정보 수정
     * 사용자의 프로필 정보를 업데이트합니다. (null이 아닌 필드만 업데이트)
     *
     * @param userId 수정할 사용자 ID
     * @param request 수정할 사용자 정보
     * @return 수정된 사용자 정보
     * @throws IllegalArgumentException 사용자를 찾을 수 없는 경우
     */
    @Transactional
    public UserResponse updateUserInfo(Long userId, UserUpdateRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        // 비즈니스 메서드를 통한 안전한 업데이트
        user.updateProfile(
            request.getUserName(),
            request.getUserResidence(),
            request.getUserAge(),
            request.getUserSalary(),
            request.getUserAssets(),
            request.getUserNote()
        );

        return UserResponse.from(user);
    }
}
