package com.youthcompass.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * AI 챗봇 응답 DTO
 * AI 서비스로부터 받은 응답을 클라이언트에 전달하기 위한 데이터 전송 객체
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AiChatResponse {
    /** AI 응답 메시지 */
    private String response;

    /** 세션 ID */
    @JsonProperty("session_id")
    private String sessionId;

    /** 검색 소스 정보 */
    @JsonProperty("search_source")
    private String searchSource;
}
