package com.youthcompass.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.youthcompass.backend.domain.User;
import com.youthcompass.backend.domain.Conversation;
import com.youthcompass.backend.domain.Message;
import com.youthcompass.backend.dto.chatbot.ChatMessageResponse;
import com.youthcompass.backend.dto.chatbot.SendMessageRequest;
import com.youthcompass.backend.dto.chatbot.SendMessageResponse;
import com.youthcompass.backend.dto.ai.AiChatRequest;
import com.youthcompass.backend.dto.ai.AiChatResponse;
import com.youthcompass.backend.dto.user.UserProfileDTO;
import com.youthcompass.backend.repository.ConversationRepository;
import com.youthcompass.backend.repository.MessageRepository;
import com.youthcompass.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.DefaultTransactionDefinition;
import org.springframework.dao.DataAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import org.springframework.http.MediaType;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 챗봇 서비스
 * 사용자와 AI 간의 메시지 송수신 및 대화 이력 관리를 담당합니다.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ChatbotService {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate; // 일반 채팅용
    private final WebClient webClient; // 스트리밍 채팅용
    private final PlatformTransactionManager transactionManager; // 수동 트랜잭션 관리
    private final ObjectMapper objectMapper = new ObjectMapper();

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
        try {
            messageRepository.save(message);
        } catch (DataAccessException e) {
            log.error("사용자 메시지 저장 실패 userId={}, conversationId={}: {}", userId, conversation.getConversationId(), e.getMessage(), e);
            throw new RuntimeException("메시지를 저장하는 중 오류가 발생했습니다.", e);
        }

        // AI 응답 생성
        String aiResponseContent = generateAiResponse(userId, conversation.getConversationId(), request.getMessage());

        // AI 응답 저장
        Message aiMessage = Message.builder()
                .conversation(conversation)
                .messageContent(aiResponseContent)
                .messageRole(Message.MessageRole.AI)
                .build();
        try {
            messageRepository.save(aiMessage);
        } catch (DataAccessException e) {
            log.error("AI 메시지 저장 실패 userId={}, conversationId={}: {}", userId, conversation.getConversationId(), e.getMessage(), e);
            throw new RuntimeException("AI 응답을 저장하는 중 오류가 발생했습니다.", e);
        }

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
        UserProfileDTO userProfile = UserProfileDTO.from(user);

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

    /**
     * 스트리밍 메시지 전송
     * SSE 스트림을 받아서 프론트엔드로 전달
     * 
     * @param userId 사용자 ID
     * @param request 메시지 전송 요청
     * @return SSE 스트림 (Flux<String>)
     * @throws IllegalArgumentException 대화방을 찾을 수 없거나 접근 권한이 없는 경우
     */
    @Transactional
    public Flux<String> sendMessageStream(Long userId, SendMessageRequest request) {
        System.out.println("=== sendMessageStream called ===");
        System.out.println("userId: " + userId);
        System.out.println("conversationId: " + request.getConversationId());
        System.out.println("message: " + request.getMessage());

        // 대화방 조회 및 권한 확인
        Conversation conversation = conversationRepository.findById(request.getConversationId())
            .orElseThrow(() -> new IllegalArgumentException("대화방을 찾을 수 없습니다."));

        if (!conversation.getUser().getUserId().equals(userId)) {
            throw new IllegalArgumentException("대화방 접근 권한이 없습니다.");
        }

        System.out.println("Conversation found and authorized");

        // 첫 번째 메시지인 경우 대화 제목 업데이트
        long messageCount = messageRepository.countByConversationConversationId(conversation.getConversationId());
        if (messageCount == 0 && "새 대화".equals(conversation.getConversationTitle())) {
            // 첫 30자까지만 제목으로 사용
            String newTitle = request.getMessage().length() > 30
                ? request.getMessage().substring(0, 30) + "..."
                : request.getMessage();
            conversation.updateTitle(newTitle);
            try {
                conversationRepository.save(conversation);
            } catch (DataAccessException e) {
                log.error("대화 제목 업데이트 실패 userId={}, conversationId={}: {}", userId, conversation.getConversationId(), e.getMessage(), e);
                throw new RuntimeException("대화 제목을 저장하는 중 오류가 발생했습니다.", e);
            }
            System.out.println("Updated conversation title to: " + newTitle);
        }

        // 사용자 메시지 저장
        Message userMessage = Message.builder()
                .conversation(conversation)
                .messageContent(request.getMessage())
                .messageRole(Message.MessageRole.USER)
                .build();
        try {
            messageRepository.save(userMessage);
        } catch (DataAccessException e) {
            log.error("스트리밍 사용자 메시지 저장 실패 userId={}, conversationId={}: {}", userId, conversation.getConversationId(), e.getMessage(), e);
            throw new RuntimeException("메시지를 저장하는 중 오류가 발생했습니다.", e);
        }

        System.out.println("User message saved");

        // 사용자 프로필 정보 생성
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        UserProfileDTO userProfile = UserProfileDTO.from(user);

        // AI 서비스 요청 생성
        AiChatRequest aiRequest = new AiChatRequest(
            request.getMessage(),
            String.valueOf(userId),
            String.valueOf(conversation.getConversationId()),
            userProfile
        );

        System.out.println("Calling AI service at: " + aiServiceUrl + "/chat-stream");

        // AI 응답을 축적할 StringBuilder (content 청크들을 모음)
        final StringBuilder responseAccumulator = new StringBuilder();
        // 웹 검색 출처를 저장할 변수
        final StringBuilder sourcesAccumulator = new StringBuilder();

        // AI 서비스 스트리밍 호출
        return webClient.post()
            .uri(aiServiceUrl + "/chat-stream")
            .bodyValue(aiRequest)
            .accept(MediaType.TEXT_EVENT_STREAM)
            .retrieve()
            .bodyToFlux(String.class)
            .doOnSubscribe(subscription -> {
                System.out.println("=== WebClient subscribed ===");
            })
            .map(dataLine -> {
                // SSE 형식 파싱: "data: {...}" -> "{...}"
                if (dataLine.startsWith("data: ")) {
                    return dataLine.substring(6); // "data: " 제거
                }
                return dataLine;
            })
            .doOnNext(chunk -> {
                try {
                    JsonNode jsonNode = objectMapper.readTree(chunk);
                    String type = jsonNode.get("type").asText();

                    // content 타입의 청크 축적
                    if ("content".equals(type) && jsonNode.has("content")) {
                        String content = jsonNode.get("content").asText();
                        responseAccumulator.append(content);
                    }

                    // sources 타입의 청크 저장
                    if ("sources".equals(type) && jsonNode.has("sources")) {
                        sourcesAccumulator.append(jsonNode.get("sources").toString());
                        System.out.println("✅ Sources captured for DB: " + sourcesAccumulator.toString());
                    }
                } catch (Exception e) {
                    // JSON 파싱 실패는 무시
                }
            })
            .doOnComplete(() -> {
                System.out.println("=== Stream completed ===");
                // 스트림 완료 후 축적된 응답을 DB에 저장
                String accumulatedResponse = responseAccumulator.toString();
                String accumulatedSources = sourcesAccumulator.toString();
                System.out.println("Accumulated response length: " + accumulatedResponse.length());
                System.out.println("Accumulated sources: " + (accumulatedSources.isEmpty() ? "none" : accumulatedSources));

                if (accumulatedResponse != null && !accumulatedResponse.isEmpty()) {
                    // 새로운 트랜잭션 시작 (Reactive 스트림은 별도 스레드에서 실행됨)
                    DefaultTransactionDefinition def = new DefaultTransactionDefinition();
                    def.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
                    TransactionStatus status = transactionManager.getTransaction(def);

                    try {
                        Message aiMessage = Message.builder()
                            .conversation(conversation)
                            .messageContent(accumulatedResponse)
                            .messageRole(Message.MessageRole.AI)
                            .messageSources(accumulatedSources.isEmpty() ? null : accumulatedSources)
                            .build();
                        try {
                            messageRepository.save(aiMessage);
                        } catch (DataAccessException e) {
                            log.error("스트리밍 AI 메시지 저장 실패 conversationId={}: {}", conversation.getConversationId(), e.getMessage(), e);
                            throw new RuntimeException("AI 응답을 저장하는 중 오류가 발생했습니다.", e);
                        }
                        transactionManager.commit(status);
                        System.out.println("✅ AI response saved to DB!");
                        System.out.println("Length: " + accumulatedResponse.length() + " chars");
                        System.out.println("Sources: " + (accumulatedSources.isEmpty() ? "none" : "saved"));
                        System.out.println("Preview: " + accumulatedResponse.substring(0, Math.min(100, accumulatedResponse.length())) + "...");
                    } catch (Exception e) {
                        transactionManager.rollback(status);
                        System.err.println("❌ Failed to save AI response to DB: " + e.getMessage());
                        log.error("스트리밍 AI 메시지 저장 트랜잭션 롤백 conversationId={}: {}", conversation.getConversationId(), e.getMessage(), e);
                    }
                } else {
                    System.err.println("⚠️  No AI response to save (accumulated response is empty)");
                }
            })
            .doOnError(error -> {
                System.err.println("=== Stream error: " + error.getMessage() + " ===");
            })
            .onErrorResume(error -> {
                return Flux.error(new RuntimeException("AI 서비스 호출 실패: " + error.getMessage()));
            });
    }
}
