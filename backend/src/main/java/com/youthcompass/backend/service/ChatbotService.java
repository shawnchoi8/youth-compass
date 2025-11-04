package com.youthcompass.backend.service;

import com.youthcompass.backend.domain.User;
import com.youthcompass.backend.domain.Conversation;
import com.youthcompass.backend.domain.Message;
import com.youthcompass.backend.dto.chatbot.ChatMessageResponse;
import com.youthcompass.backend.dto.chatbot.SendMessageRequest;
import com.youthcompass.backend.dto.chatbot.SendMessageResponse;
import com.youthcompass.backend.dto.ai.AiChatRequest;
import com.youthcompass.backend.dto.ai.AiChatResponse;
import com.youthcompass.backend.repository.ConversationRepository;
import com.youthcompass.backend.repository.MessageRepository;
import com.youthcompass.backend.repository.UserRepository;
import lombok.Builder;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 챗봇 서비스
 * 사용자와 AI 간의 메시지 송수신 및 대화 이력 관리를 담당합니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChatbotService {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate;

    @Value("${ai.service.url:http://ai-service:8000}")
    private String aiServiceUrl;

    /**
     * 메시지 전송 및 AI 응답 처리
     * 사용자 메시지를 저장하고 AI 서비스를 호출하여 응답을 생성합니다.
     *
     * @param userId 사용자 ID
     * @param request 메시지 전송 요청
     * @return 사용자 메시지와 AI 응답
     * @throws IllegalArgumentException 대화방을 찾을 수 없거나 접근 권한이 없는 경우
     * @throws RuntimeException AI 서비스 호출 실패 시
     */
    @Transactional
    public SendMessageResponse sendMessage(Long userId, SendMessageRequest request) {
        // 대화방 조회
        Conversation conversation = conversationRepository.findById(request.getConversationId())
            .orElseThrow(() -> new IllegalArgumentException("대화방을 찾을 수 없습니다."));

        // 대화방 소유자 확인
        if (!conversation.getUser().getUserId().equals(userId)) {
            throw new IllegalArgumentException("대화방 접근 권한이 없습니다.");
        }

        // 사용자 메시지 저장
        Message message = Message.builder()
                .conversation(conversation)
                .messageContent(request.getMessage())
                .messageRole(Message.MessageRole.USER)
                .build();
        messageRepository.save(message);

        // AI 응답 생성
        String aiResponseContent = generateAiResponse(userId, conversation.getConversationId(), request.getMessage());

        // AI 응답 저장
        Message aiMessage = Message.builder()
                .conversation(conversation)
                .messageContent(aiResponseContent)
                .messageRole(Message.MessageRole.AI)
                .build();
        messageRepository.save(aiMessage);

        return new SendMessageResponse(
            conversation.getConversationId(),
            ChatMessageResponse.from(message),
            ChatMessageResponse.from(aiMessage)
        );
    }

    /**
     * AI 응답 생성 - Python AI 서비스 호출
     * 사용자 프로필 정보와 함께 AI 서비스를 호출하여 응답을 생성합니다.
     *
     * @param userId 사용자 ID
     * @param conversationId 대화방 ID
     * @param userMessage 사용자 메시지
     * @return AI 응답 메시지
     * @throws IllegalArgumentException 사용자를 찾을 수 없는 경우
     * @throws RuntimeException AI 서비스 호출 실패 시
     */
    private String generateAiResponse(Long userId, Long conversationId, String userMessage) {
        // 사용자 정보 조회
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        // 사용자 프로필 정보 생성
        Map<String, Object> userProfile = new HashMap<>();
        userProfile.put("user_id", user.getUserId());
        userProfile.put("age", user.getUserAge());
        userProfile.put("residence", user.getUserResidence());
        userProfile.put("salary", user.getUserSalary());
        userProfile.put("assets", user.getUserAssets());
        userProfile.put("note", user.getUserNote());

        // AI 서비스 요청 생성
        AiChatRequest aiRequest = new AiChatRequest(
            userMessage,
            String.valueOf(userId),
            String.valueOf(conversationId),
            userProfile
        );

        try {
            // Python AI 서비스 호출
            AiChatResponse aiResponse = restTemplate.postForObject(
                aiServiceUrl + "/chat",
                aiRequest,
                AiChatResponse.class
            );

            if (aiResponse != null && aiResponse.getResponse() != null) {
                return aiResponse.getResponse();
            } else {
                throw new RuntimeException("AI 서비스 응답이 비어있습니다.");
            }
        } catch (Exception e) {
            throw new RuntimeException("AI 서비스 호출 실패: " + e.getMessage(), e);
        }
    }

    /**
     * 대화 기록 조회
     * 특정 대화방의 모든 메시지를 시간순으로 조회합니다.
     *
     * @param userId 사용자 ID
     * @param conversationId 대화방 ID
     * @return 대화 메시지 목록
     * @throws IllegalArgumentException 대화방을 찾을 수 없거나 접근 권한이 없는 경우
     */
    public List<ChatMessageResponse> getConversationHistory(Long userId, Long conversationId) {
        // 대화방 조회 및 권한 확인
        Conversation conversation = conversationRepository.findById(conversationId)
            .orElseThrow(() -> new IllegalArgumentException("대화방을 찾을 수 없습니다."));

        if (!conversation.getUser().getUserId().equals(userId)) {
            throw new IllegalArgumentException("대화방 접근 권한이 없습니다.");
        }

        // 메시지 조회
        List<Message> messages = messageRepository
            .findByConversationConversationIdOrderByMessageCreatedAtAsc(conversationId);

        return messages.stream()
            .map(ChatMessageResponse::from)
            .collect(Collectors.toList());
    }
}
