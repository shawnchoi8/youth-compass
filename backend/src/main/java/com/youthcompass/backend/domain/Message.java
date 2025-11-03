package com.youthcompass.backend.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 메시지 엔티티
 * 대화방 내의 개별 메시지를 관리하는 도메인 객체
 */
@Entity
@Table(name = "user_messages")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "message_id")
    private Long messageId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @Column(name = "message_content", columnDefinition = "TEXT")
    private String messageContent;

    @Enumerated(EnumType.STRING)
    @Column(name = "message_role", nullable = false)
    private MessageRole messageRole;

    @CreationTimestamp
    @Column(name = "message_created_at", updatable = false)
    private LocalDateTime messageCreatedAt;

    public enum MessageRole {
        USER, AI
    }
}
