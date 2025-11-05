/**
 * Backend API 클라이언트
 * Spring Boot Backend와 통신하는 API 함수들
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

/**
 * localStorage에서 현재 로그인한 사용자 ID 가져오기
 */
function getCurrentUserId(): string | null {
  return localStorage.getItem("userId");
}

/**
 * API 요청 헬퍼 함수
 * @param requireAuth - true면 User-Id 헤더 필수 (기본값: true)
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  requireAuth: boolean = true
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // 인증이 필요한 API인 경우에만 User-Id 헤더 추가
  if (requireAuth) {
    const userId = getCurrentUserId();
    if (!userId) {
      throw new Error("로그인이 필요합니다.");
    }
    headers["User-Id"] = userId;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  // 204 No Content인 경우 빈 객체 반환
  if (response.status === 204) {
    return {} as T;
  }

  // Content-Length가 0이거나 응답 본문이 비어있는 경우 빈 객체 반환
  const contentLength = response.headers.get("content-length");
  if (contentLength === "0") {
    return {} as T;
  }

  // Content-Type이 JSON이 아닌 경우 또는 없는 경우 처리
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const text = await response.text();
    if (!text || text.trim() === "") {
      return {} as T;
    }
    throw new Error(`Expected JSON response but got: ${contentType}`);
  }

  return response.json();
}

// ===== Types =====

export interface ChatMessageResponse {
  messageId: number;
  messageContent: string;
  messageRole: "USER" | "AI";
  messageCreatedAt: string;
  messageSources?: string; // JSON 문자열
}

export interface SendMessageRequest {
  conversationId: number;
  message: string;
}

export interface SendMessageResponse {
  conversationId: number;
  userMessage: ChatMessageResponse;
  aiMessage: ChatMessageResponse;
}

export interface ConversationResponse {
  conversationId: number;
  conversationTitle: string;
  conversationCreatedAt: string;
  conversationUpdatedAt: string;
}

export interface CreateConversationRequest {
  conversationTitle: string;
}

export interface ConversationHistoryResponse {
  conversation: ConversationResponse;
  messages: ChatMessageResponse[];
}

export interface CategoryResponse {
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  categoryIsActive: boolean;
  categoryCreatedAt: string;
}

export interface FaqResponse {
  faqId: number;
  categoryId: number;
  categoryName: string;
  faqQuestion: string;
  faqAnswer: string;
  faqOrder: number;
  faqDetailUrl: string;
  faqCreatedAt: string;
}

// ===== Chatbot API =====

/**
 * 메시지 전송 (일반)
 */
export async function sendMessage(
  request: SendMessageRequest
): Promise<SendMessageResponse> {
  return apiRequest<SendMessageResponse>("/chat", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/**
 * 메시지 전송 (스트리밍)
 * Server-Sent Events (SSE)를 통한 실시간 응답
 */
export async function sendMessageStream(
  request: SendMessageRequest,
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): Promise<void> {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      throw new Error("로그인이 필요합니다.");
    }

    const response = await fetch(`${API_BASE_URL}/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Id": userId,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error("Response body is null");
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      for (const line of lines) {
        // SSE 형식 파싱: "data:" 또는 "data: " (공백 여부 모두 처리)
        if (line.startsWith("data:")) {
          const data = line.startsWith("data: ") ? line.slice(6) : line.slice(5);
          if (data.trim()) {
            onChunk(data);
          }
        }
      }
    }

    onComplete();
  } catch (error) {
    onError(error as Error);
  }
}

/**
 * 대화 기록 조회
 */
export async function getChatHistory(
  conversationId: number
): Promise<ChatMessageResponse[]> {
  return apiRequest<ChatMessageResponse[]>(
    `/chat/history/${conversationId}`
  );
}

// ===== Conversation API =====

/**
 * 새 대화방 생성
 */
export async function createConversation(
  request: CreateConversationRequest
): Promise<ConversationResponse> {
  return apiRequest<ConversationResponse>("/conversations", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/**
 * 사용자의 모든 대화방 목록 조회
 */
export async function getUserConversations(): Promise<ConversationResponse[]> {
  return apiRequest<ConversationResponse[]>("/conversations");
}

/**
 * 특정 대화방의 전체 대화 이력 조회
 */
export async function getConversationHistory(
  conversationId: number
): Promise<ConversationHistoryResponse> {
  return apiRequest<ConversationHistoryResponse>(
    `/conversations/${conversationId}`
  );
}

/**
 * 대화방 삭제
 */
export async function deleteConversation(conversationId: number): Promise<void> {
  await apiRequest<void>(`/conversations/${conversationId}`, {
    method: "DELETE",
  });
}

// ===== FAQ API =====

/**
 * 모든 활성화된 카테고리 조회
 */
export async function getActiveCategories(): Promise<CategoryResponse[]> {
  return apiRequest<CategoryResponse[]>("/faq/categories");
}

/**
 * 특정 카테고리의 FAQ 목록 조회
 */
export async function getFaqsByCategory(
  categoryId: number
): Promise<FaqResponse[]> {
  return apiRequest<FaqResponse[]>(`/faq/categories/${categoryId}`);
}

/**
 * FAQ 검색
 */
export async function searchFaqs(keyword: string): Promise<FaqResponse[]> {
  return apiRequest<FaqResponse[]>(
    `/faq/search?keyword=${encodeURIComponent(keyword)}`
  );
}

/**
 * 모든 FAQ 조회
 */
export async function getAllFaqs(): Promise<FaqResponse[]> {
  return apiRequest<FaqResponse[]>("/faq");
}

// ===== User API =====

export interface UserRegisterRequest {
  userLoginId: string;
  userPassword: string;
  userName: string;
  userResidence?: string;
  userAge?: number;
  userSalary?: number;
  userAssets?: number;
  userNote?: string;
  userAgreePrivacy?: boolean;
}

export interface UserLoginRequest {
  userLoginId: string;
  userPassword: string;
}

export interface UserResponse {
  userId: number;
  userLoginId: string;
  userName: string;
  userResidence?: string;
  userAge?: number;
  userSalary?: number;
  userAssets?: number;
  userNote?: string;
  userAgreePrivacy?: boolean;
  userCreatedAt: string;
  userUpdatedAt: string;
}

/**
 * 회원가입
 */
export async function registerUser(
  request: UserRegisterRequest
): Promise<UserResponse> {
  return apiRequest<UserResponse>("/users/register", {
    method: "POST",
    body: JSON.stringify(request),
  }, false); // 인증 불필요
}

/**
 * 로그인
 */
export async function loginUser(
  request: UserLoginRequest
): Promise<UserResponse> {
  return apiRequest<UserResponse>("/users/login", {
    method: "POST",
    body: JSON.stringify(request),
  }, false); // 인증 불필요
}

/**
 * 사용자 정보 조회
 */
export async function getUserInfo(userId: number): Promise<UserResponse> {
  return apiRequest<UserResponse>(`/users/${userId}`);
}

/**
 * 사용자 정보 수정
 */
export async function updateUserInfo(
  userId: number,
  request: Partial<UserRegisterRequest>
): Promise<UserResponse> {
  return apiRequest<UserResponse>(`/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(request),
  });
}
