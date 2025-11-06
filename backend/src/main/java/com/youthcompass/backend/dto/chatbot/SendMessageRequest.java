package com.youthcompass.backend.dto.chatbot;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 메시지 전송 요청 DTO
 * 사용자가 챗봇에 메시지를 전송하기 위한 데이터 전송 객체
 */
@Getter
@Setter
@NoArgsConstructor
public class SendMessageRequest {

    /** 대화방 ID (비회원은 null 또는 음수 허용) */
    private Long conversationId;

    /** 사용자가 전송한 메시지 내용 */
    @NotBlank(message = "메시지 내용은 필수입니다.")
    private String message;
}
