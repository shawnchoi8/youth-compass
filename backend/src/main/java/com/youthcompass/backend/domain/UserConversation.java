package com.youthcompass.backend.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_conversations")
@Getter
@Setter
@NoArgsConstructor
public class UserConversation {

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
