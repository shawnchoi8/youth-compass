package com.youthcompass.backend.dto.conversation;

import com.youthcompass.backend.dto.chatbot.ChatMessageResponse;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * 대화 이력 응답 DTO
 * 대화방의 전체 메시지 이력을 클라이언트에 전달하기 위한 데이터 전송 객체
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ConversationHistoryResponse {

    /** 대화방 ID */
    private Long conversationId;

    /** 대화방 제목 */
    private String conversationTitle;

    /** 대화 메시지 목록 */
    private List<ChatMessageResponse> messages;
}
