package com.youthcompass.backend.repository;

import com.youthcompass.backend.domain.UserMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserMessageRepository extends JpaRepository<UserMessage, Long> {

    /**
     * 특정 대화방의 모든 메시지 조회 (시간순)
     */
    List<UserMessage> findByConversationConversationIdOrderByMessageCreatedAtAsc(Long conversationId);

    /**
     * 특정 대화방의 최근 N개 메시지 조회 (AI 컨텍스트용)
     */
    @Query("SELECT m FROM UserMessage m WHERE m.conversation.conversationId = :conversationId " +
           "ORDER BY m.messageCreatedAt DESC LIMIT :limit")
    List<UserMessage> findRecentMessagesByConversationId(@Param("conversationId") Long conversationId,
                                                          @Param("limit") int limit);

    /**
     * 특정 대화방의 메시지 개수
     */
    long countByConversationConversationId(Long conversationId);
}
