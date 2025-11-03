package com.youthcompass.backend.repository;

import com.youthcompass.backend.domain.UserConversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserConversationRepository extends JpaRepository<UserConversation, Long> {

    /**
     * 특정 사용자의 모든 대화방 조회 (최신순)
     */
    List<UserConversation> findByUserUserIdOrderByConversationCreatedAtDesc(Long userId);

    /**
     * 특정 사용자의 대화방 개수
     */
    long countByUserUserId(Long userId);
}
