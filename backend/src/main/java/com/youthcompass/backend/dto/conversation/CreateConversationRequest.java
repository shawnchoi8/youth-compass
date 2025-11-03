package com.youthcompass.backend.dto.conversation;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 대화방 생성 요청 DTO
 * 새로운 대화방을 생성하기 위한 데이터 전송 객체
 */
@Getter
@Setter
@NoArgsConstructor
public class CreateConversationRequest {

    /** 대화방 제목 */
    private String conversationTitle;
}
