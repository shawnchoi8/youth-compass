package com.youthcompass.backend.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 대화방 엔티티
 * 사용자와 AI 간의 대화 세션을 관리하는 도메인 객체
 */
@Entity
@Table(name = "user_conversations")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "conversation_id")
    private Long conversationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "conversation_title", length = 500)
    private String conversationTitle;

    @CreationTimestamp
    @Column(name = "conversation_created_at", updatable = false)
    private LocalDateTime conversationCreatedAt;
}
