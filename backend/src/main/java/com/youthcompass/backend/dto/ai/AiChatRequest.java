package com.youthcompass.backend.dto.ai;

import com.youthcompass.backend.dto.user.UserProfileDTO;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * AI 챗봇 요청 DTO
 * AI 서비스에 채팅 메시지를 전송하기 위한 데이터 전송 객체
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AiChatRequest {
    /** 사용자 메시지 */
    private String message;

    /** 사용자 ID */
    private String userId;

    /** 세션 ID */
    private String sessionId;

    /** 사용자 프로필 정보 */
    private UserProfileDTO userProfile;
}
