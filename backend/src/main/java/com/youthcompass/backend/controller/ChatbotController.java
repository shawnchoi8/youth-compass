package com.youthcompass.backend.controller;

import com.youthcompass.backend.dto.chatbot.ChatMessageResponse;
import com.youthcompass.backend.dto.chatbot.SendMessageRequest;
import com.youthcompass.backend.dto.chatbot.SendMessageResponse;
import com.youthcompass.backend.service.ChatbotService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
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
        // 서비스에서 던진 예외를 HTTP 상태 코드로 변환하여 클라이언트가 원인을 식별할 수 있도록 처리
        try {
            SendMessageResponse response = chatbotService.sendMessage(userId, request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage(), e);
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "답변 생성 중 오류가 발생했습니다. 다시 질문해 주세요.", e);
        }
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
        // 스트리밍 응답에서도 동일한 예외 매핑을 적용해 일관된 에러 응답을 제공
        try {
            return chatbotService.sendMessageStream(userId, request)
                .map(data -> ServerSentEvent.<String>builder()
                    .data(data)
                    .build())
                .onErrorMap(IllegalArgumentException.class,
                    e -> new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage(), e))
                .onErrorMap(RuntimeException.class, e ->
                    e instanceof ResponseStatusException
                        ? e
                        : new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "답변 생성 중 오류가 발생했습니다. 다시 질문해 주세요.", e));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage(), e);
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "답변 생성 중 오류가 발생했습니다. 다시 질문해 주세요.", e);
        }
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
        // 대화 기록 조회 실패 원인을 HTTP 상태 코드로 변환
        try {
            List<ChatMessageResponse> history = chatbotService.getConversationHistory(userId, conversationId);
            return ResponseEntity.ok(history);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage(), e);
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.", e);
        }
    }
}
