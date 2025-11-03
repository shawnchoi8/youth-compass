package com.youthcompass.backend.dto.conversation;

import com.youthcompass.backend.domain.Conversation;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 대화방 정보 응답 DTO
 * 대화방 정보를 클라이언트에 전달하기 위한 데이터 전송 객체
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ConversationResponse {

    /** 대화방 ID */
    private Long conversationId;

    /** 대화방 제목 */
    private String conversationTitle;

    /** 대화방 생성 일시 */
    private LocalDateTime conversationCreatedAt;

    /**
     * Conversation 엔티티로부터 ConversationResponse 객체를 생성합니다.
     * @param conversation Conversation 엔티티
     * @return ConversationResponse 객체
     */
    public static ConversationResponse from(Conversation conversation) {
        return new ConversationResponse(
            conversation.getConversationId(),
            conversation.getConversationTitle(),
            conversation.getConversationCreatedAt()
        );
    }
}
