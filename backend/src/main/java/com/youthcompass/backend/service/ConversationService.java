package com.youthcompass.backend.service;

import com.youthcompass.backend.domain.User;
import com.youthcompass.backend.domain.Conversation;
import com.youthcompass.backend.dto.conversation.ConversationHistoryResponse;
import com.youthcompass.backend.dto.conversation.ConversationResponse;
import com.youthcompass.backend.dto.conversation.CreateConversationRequest;
import com.youthcompass.backend.dto.chatbot.ChatMessageResponse;
import com.youthcompass.backend.repository.ConversationRepository;
import com.youthcompass.backend.repository.MessageRepository;
import com.youthcompass.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 대화방 관리 서비스
 * 대화방 생성, 조회, 삭제 및 대화 이력 관리를 담당합니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    /**
     * 새 대화방 생성
     * 사용자를 위한 새로운 대화방을 생성합니다.
     *
     * @param userId 사용자 ID
     * @param request 대화방 생성 요청 (제목 포함)
     * @return 생성된 대화방 정보
     * @throws IllegalArgumentException 사용자를 찾을 수 없는 경우
     */
    @Transactional
    public ConversationResponse createConversation(Long userId, CreateConversationRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        Conversation conversation = Conversation.builder()
                .user(user)
                .conversationTitle(request.getConversationTitle())
                .build();

        Conversation savedConversation = conversationRepository.save(conversation);

        return ConversationResponse.from(savedConversation);
    }

    /**
     * 사용자의 모든 대화방 목록 조회
     * 특정 사용자의 모든 대화방을 최신순으로 조회합니다.
     *
     * @param userId 사용자 ID
     * @return 대화방 목록 (최신순)
     */
    public List<ConversationResponse> getUserConversations(Long userId) {
        List<Conversation> conversations = conversationRepository
            .findByUserUserIdOrderByConversationCreatedAtDesc(userId);

        return conversations.stream()
            .map(ConversationResponse::from)
            .collect(Collectors.toList());
    }

    /**
     * 특정 대화방의 전체 대화 이력 조회
     * 대화방 정보와 모든 메시지를 시간순으로 조회합니다.
     *
     * @param userId 사용자 ID
     * @param conversationId 대화방 ID
     * @return 대화방 정보 및 메시지 목록
     * @throws IllegalArgumentException 대화방을 찾을 수 없거나 접근 권한이 없는 경우
     */
    public ConversationHistoryResponse getConversationHistory(Long userId, Long conversationId) {
        Conversation conversation = conversationRepository.findById(conversationId)
            .orElseThrow(() -> new IllegalArgumentException("대화방을 찾을 수 없습니다."));

        // 권한 확인
        if (!conversation.getUser().getUserId().equals(userId)) {
            throw new IllegalArgumentException("대화방 접근 권한이 없습니다.");
        }

        List<ChatMessageResponse> messages = messageRepository
            .findByConversationConversationIdOrderByMessageCreatedAtAsc(conversationId)
            .stream()
            .map(ChatMessageResponse::from)
            .collect(Collectors.toList());

        return new ConversationHistoryResponse(
            conversation.getConversationId(),
            conversation.getConversationTitle(),
            messages
        );
    }

    /**
     * 대화방 삭제
     * 특정 대화방과 관련된 모든 메시지를 삭제합니다.
     *
     * @param userId 사용자 ID
     * @param conversationId 삭제할 대화방 ID
     * @throws IllegalArgumentException 대화방을 찾을 수 없거나 접근 권한이 없는 경우
     */
    @Transactional
    public void deleteConversation(Long userId, Long conversationId) {
        Conversation conversation = conversationRepository.findById(conversationId)
            .orElseThrow(() -> new IllegalArgumentException("대화방을 찾을 수 없습니다."));

        // 권한 확인
        if (!conversation.getUser().getUserId().equals(userId)) {
            throw new IllegalArgumentException("대화방 접근 권한이 없습니다.");
        }

        conversationRepository.delete(conversation);
    }
}
