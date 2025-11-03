package com.youthcompass.backend.dto.chatbot;

import com.youthcompass.backend.domain.Message;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 채팅 메시지 응답 DTO
 * 채팅 메시지 정보를 클라이언트에 전달하기 위한 데이터 전송 객체
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageResponse {

    /** 메시지 ID */
    private Long messageId;

    /** 메시지 내용 */
    private String messageContent;

    /** 메시지 발신자 (USER 또는 AI) */
    private String messageRole;

    /** 메시지 생성 일시 */
    private LocalDateTime messageCreatedAt;

    /**
     * Message 엔티티로부터 ChatMessageResponse 객체를 생성합니다.
     * @param message Message 엔티티
     * @return ChatMessageResponse 객체
     */
    public static ChatMessageResponse from(Message message) {
        return new ChatMessageResponse(
            message.getMessageId(),
            message.getMessageContent(),
            message.getMessageRole().name(),
            message.getMessageCreatedAt()
        );
    }
}
