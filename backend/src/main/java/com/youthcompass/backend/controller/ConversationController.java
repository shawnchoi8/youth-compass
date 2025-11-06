package com.youthcompass.backend.controller;

import com.youthcompass.backend.dto.conversation.ConversationHistoryResponse;
import com.youthcompass.backend.dto.conversation.ConversationResponse;
import com.youthcompass.backend.dto.conversation.CreateConversationRequest;
import com.youthcompass.backend.service.ConversationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

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
        // 서비스 예외를 HTTP 상태 코드로 변환해 클라이언트에 전달
        try {
            ConversationResponse response = conversationService.createConversation(userId, request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            throw translateIllegalArgument(e);
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "대화방 생성 중 오류가 발생했습니다.", e);
        }
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
        // 조회 오류를 상태 코드로 매핑하여 일관된 응답 제공
        try {
            List<ConversationResponse> conversations = conversationService.getUserConversations(userId);
            return ResponseEntity.ok(conversations);
        } catch (IllegalArgumentException e) {
            throw translateIllegalArgument(e);
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "대화방 목록 조회 중 오류가 발생했습니다.", e);
        }
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
        // 대화 기록 조회 실패 시 적절한 상태 코드 반환
        try {
            ConversationHistoryResponse history = conversationService.getConversationHistory(userId, conversationId);
            return ResponseEntity.ok(history);
        } catch (IllegalArgumentException e) {
            throw translateIllegalArgument(e);
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "대화방 이력 조회 중 오류가 발생했습니다.", e);
        }
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
        // 삭제 과정에서 발생한 예외를 상태 코드로 변환
        try {
            conversationService.deleteConversation(userId, conversationId);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            throw translateIllegalArgument(e);
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "대화방 삭제 중 오류가 발생했습니다.", e);
        }
    }

    // 대화방 관련 IllegalArgumentException을 의미 있는 HTTP 상태 코드로 매핑
    private ResponseStatusException translateIllegalArgument(IllegalArgumentException e) {
        String message = e.getMessage();
        if ("사용자를 찾을 수 없습니다.".equals(message)) {
            return new ResponseStatusException(HttpStatus.NOT_FOUND, message, e);
        }
        if ("대화방을 찾을 수 없습니다.".equals(message)) {
            return new ResponseStatusException(HttpStatus.NOT_FOUND, message, e);
        }
        if ("대화방 접근 권한이 없습니다.".equals(message)) {
            return new ResponseStatusException(HttpStatus.FORBIDDEN, message, e);
        }
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message, e);
    }
}
