package com.youthcompass.backend.dto.chatbot;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 메시지 전송 응답 DTO
 * 메시지 전송 결과와 AI 응답을 클라이언트에 전달하기 위한 데이터 전송 객체
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SendMessageResponse {

    /** 대화방 ID */
    private Long conversationId;

    /** 사용자 메시지 */
    private ChatMessageResponse userMessage;

    /** AI 응답 메시지 */
    private ChatMessageResponse aiMessage;
}
