package com.youthcompass.backend.repository;

import com.youthcompass.backend.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * 로그인 ID로 사용자 조회
     */
    Optional<User> findByUserLoginId(String userLoginId);

    /**
     * 로그인 ID 중복 체크
     */
    boolean existsByUserLoginId(String userLoginId);
}
