package com.youthcompass.backend.controller;

import com.youthcompass.backend.dto.chatbot.ChatMessageResponse;
import com.youthcompass.backend.dto.chatbot.SendMessageRequest;
import com.youthcompass.backend.dto.chatbot.SendMessageResponse;
import com.youthcompass.backend.service.ChatbotService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.List;

/**
 * 챗봇 REST API Controller
 * AI 챗봇과의 메시지 송수신 및 대화 이력 조회 관련 엔드포인트를 제공합니다.
 */
@RestController
@RequestMapping("/chat")
@RequiredArgsConstructor
public class ChatbotController {

    private final ChatbotService chatbotService;

    /**
     * 메시지 전송
     * 사용자 메시지를 AI 서비스로 전송하고 응답을 받습니다.
     * (프론트엔드 -> Java 백엔드 -> Python AI 서비스)
     *
     * @param userId 사용자 ID (헤더, TODO: JWT 인증으로 대체 예정)
     * @param request 메시지 전송 요청 (대화방 ID, 메시지 내용)
     * @return 사용자 메시지와 AI 응답 (HTTP 200)
     */
    @PostMapping
    public ResponseEntity<SendMessageResponse> sendMessage(
            @RequestHeader("User-Id") Long userId, // TODO: JWT 인증으로 대체 예정
            @Valid @RequestBody SendMessageRequest request
    ) {
        SendMessageResponse response = chatbotService.sendMessage(userId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * 스트리밍 메시지 전송
     * 사용자 메시지를 AI 서비스로 전송하고 SSE 스트림으로 응답을 받습니다.
     * (프론트엔드 -> Java 백엔드 -> Python AI 서비스)
     *
     * @param userId 사용자 ID (헤더, TODO: JWT 인증으로 대체 예정)
     * @param request 메시지 전송 요청 (대화방 ID, 메시지 내용)
     * @return SSE 스트림 (HTTP 200)
     */
    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> sendMessageStream(
            @RequestHeader("User-Id") Long userId, // TODO: JWT 인증으로 대체 예정
            @Valid @RequestBody SendMessageRequest request
    ) {
        return chatbotService.sendMessageStream(userId, request)
            .map(data -> ServerSentEvent.<String>builder()
                .data(data)
                .build());
    }

    /**
     * 대화 기록 조회
     * 특정 대화방의 모든 메시지를 시간순으로 조회합니다.
     *
     * @param userId 사용자 ID (헤더, TODO: JWT 인증으로 대체 예정)
     * @param conversationId 대화방 ID (경로 변수)
     * @return 대화 메시지 목록 (HTTP 200)
     */
    @GetMapping("/history/{conversationId}")
    public ResponseEntity<List<ChatMessageResponse>> getHistory(
            @RequestHeader("User-Id") Long userId, // TODO: JWT 인증으로 대체 예정
            @PathVariable Long conversationId
    ) {
        List<ChatMessageResponse> history = chatbotService.getConversationHistory(userId, conversationId);
        return ResponseEntity.ok(history);
    }
}
