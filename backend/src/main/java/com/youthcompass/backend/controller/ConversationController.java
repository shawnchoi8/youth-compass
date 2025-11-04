package com.youthcompass.backend.controller;

import com.youthcompass.backend.dto.conversation.ConversationHistoryResponse;
import com.youthcompass.backend.dto.conversation.ConversationResponse;
import com.youthcompass.backend.dto.conversation.CreateConversationRequest;
import com.youthcompass.backend.service.ConversationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 대화방 관리 REST API Controller
 * 대화방 생성, 조회, 삭제 및 대화 이력 관리 관련 엔드포인트를 제공합니다.
 */
@RestController
@RequestMapping("/conversations")
@RequiredArgsConstructor
public class ConversationController {

    private final ConversationService conversationService;

    /**
     * 새 대화방 생성
     * 사용자를 위한 새로운 대화방을 생성합니다.
     *
     * @param userId 사용자 ID (헤더, TODO: JWT 인증으로 대체 예정)
     * @param request 대화방 생성 요청 (제목 포함)
     * @return 생성된 대화방 정보 (HTTP 200)
     */
    @PostMapping
    public ResponseEntity<ConversationResponse> createConversation(
            @RequestHeader("User-Id") Long userId, // TODO: JWT 인증으로 대체 예정
            @Valid @RequestBody CreateConversationRequest request
    ) {
        ConversationResponse response = conversationService.createConversation(userId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * 사용자의 모든 대화방 목록 조회
     * 특정 사용자의 모든 대화방을 최신순으로 조회합니다.
     *
     * @param userId 사용자 ID (헤더, TODO: JWT 인증으로 대체 예정)
     * @return 대화방 목록 (HTTP 200)
     */
    @GetMapping
    public ResponseEntity<List<ConversationResponse>> getUserConversations(
            @RequestHeader("User-Id") Long userId // TODO: JWT 인증으로 대체 예정
    ) {
        List<ConversationResponse> conversations = conversationService.getUserConversations(userId);
        return ResponseEntity.ok(conversations);
    }

    /**
     * 특정 대화방의 전체 대화 이력 조회
     * 대화방 정보와 모든 메시지를 시간순으로 조회합니다.
     *
     * @param userId 사용자 ID (헤더, TODO: JWT 인증으로 대체 예정)
     * @param conversationId 대화방 ID (경로 변수)
     * @return 대화방 정보 및 메시지 목록 (HTTP 200)
     */
    @GetMapping("/{conversationId}")
    public ResponseEntity<ConversationHistoryResponse> getConversationHistory(
            @RequestHeader("User-Id") Long userId, // TODO: JWT 인증으로 대체 예정
            @PathVariable Long conversationId
    ) {
        ConversationHistoryResponse history = conversationService.getConversationHistory(userId, conversationId);
        return ResponseEntity.ok(history);
    }

    /**
     * 대화방 삭제
     * 특정 대화방과 관련된 모든 메시지를 삭제합니다.
     *
     * @param userId 사용자 ID (헤더, TODO: JWT 인증으로 대체 예정)
     * @param conversationId 삭제할 대화방 ID (경로 변수)
     * @return 빈 응답 (HTTP 204 No Content)
     */
    @DeleteMapping("/{conversationId}")
    public ResponseEntity<Void> deleteConversation(
            @RequestHeader("User-Id") Long userId, // TODO: JWT 인증으로 대체 예정
            @PathVariable Long conversationId
    ) {
        conversationService.deleteConversation(userId, conversationId);
        return ResponseEntity.noContent().build();
    }
}
