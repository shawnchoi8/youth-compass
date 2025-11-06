import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import ChatMessage from "@/components/ChatMessage";
import PolicyCard from "@/components/PolicyCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles, Plus, MessageSquare, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  createConversation,
  sendMessageStream,
  getUserConversations,
  getConversationHistory,
  deleteConversation,
  FaqResponse,
  ConversationResponse,
} from "@/lib/api";

// 로그인 상태 확인 함수
const getCurrentUserId = (): string | null => {
  return localStorage.getItem("userId");
};

// 비회원 대화 목록 관리 (sessionStorage)
const GUEST_CONVERSATIONS_KEY = "guest_conversations";
const GUEST_MESSAGES_PREFIX = "guest_messages_";

const loadGuestConversations = (): ConversationResponse[] => {
  try {
    const data = sessionStorage.getItem(GUEST_CONVERSATIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveGuestConversations = (conversations: ConversationResponse[]) => {
  try {
    sessionStorage.setItem(GUEST_CONVERSATIONS_KEY, JSON.stringify(conversations));
  } catch (error) {
    console.error("Failed to save guest conversations:", error);
  }
};

const loadGuestMessages = (conversationId: number): Message[] => {
  try {
    const data = sessionStorage.getItem(`${GUEST_MESSAGES_PREFIX}${conversationId}`);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveGuestMessages = (conversationId: number, messages: Message[]) => {
  try {
    sessionStorage.setItem(`${GUEST_MESSAGES_PREFIX}${conversationId}`, JSON.stringify(messages));
  } catch (error) {
    console.error("Failed to save guest messages:", error);
  }
};

const deleteGuestConversation = (conversationId: number) => {
  try {
    sessionStorage.removeItem(`${GUEST_MESSAGES_PREFIX}${conversationId}`);
    const conversations = loadGuestConversations();
    const updated = conversations.filter(c => c.conversationId !== conversationId);
    saveGuestConversations(updated);
  } catch (error) {
    console.error("Failed to delete guest conversation:", error);
  }
};

const generateGuestConversationId = (): number => {
  const conversations = loadGuestConversations();
  if (conversations.length === 0) return -1;
  const minId = Math.min(...conversations.map(c => c.conversationId));
  return minId - 1;
};

interface Source {
  title: string;
  url: string;
  score: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  policies?: FaqResponse[];
  sources?: Source[];
}

const Chat = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [initialQuery, setInitialQuery] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 대화 목록 불러오기
  const loadConversations = async () => {
    // 로그인 상태 확인
    const userId = getCurrentUserId();
    if (!userId) {
      // 비회원인 경우 sessionStorage에서 불러오기
      const guestConvs = loadGuestConversations();
      setConversations(guestConvs);
      return;
    }

    try {
      const convs = await getUserConversations();

      // 제목이 있는 대화만 필터링 & 중복 제목 제거 (최신 것만 유지)
      const validConvs = convs.filter(c => c.conversationTitle && c.conversationTitle.trim() !== "");
      const uniqueConvs = validConvs.reduce((acc, conv) => {
        const existing = acc.find(c => c.conversationTitle === conv.conversationTitle);
        if (!existing) {
          acc.push(conv);
        }
        return acc;
      }, [] as ConversationResponse[]);

      setConversations(uniqueConvs);
    } catch (error) {
      console.error("Failed to load conversations:", error);
      setConversations([]);
    }
  };

  // 새 대화 시작
  const startNewConversation = async () => {
    // 로그인 상태 확인
    const userId = getCurrentUserId();
    if (!userId) {
      // 비회원인 경우 sessionStorage에 새 대화 생성
      const guestConvId = generateGuestConversationId();
      const now = new Date().toISOString();
      const newConversation: ConversationResponse = {
        conversationId: guestConvId,
        conversationTitle: "새 대화",
        conversationCreatedAt: now,
        conversationUpdatedAt: now,
      };
      
      const guestConvs = loadGuestConversations();
      guestConvs.unshift(newConversation); // 최신 대화를 맨 앞에 추가
      saveGuestConversations(guestConvs);
      
      setConversationId(guestConvId);
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: "안녕하세요! 청년 정책에 대해 무엇이든 물어보세요. 😊",
          timestamp: new Date().toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
      await loadConversations(); // 목록 새로고침
      return;
    }

    try {
      const conversation = await createConversation({
        conversationTitle: "새 대화",
      });
      setConversationId(conversation.conversationId);
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: "안녕하세요! 청년 정책에 대해 무엇이든 물어보세요. 😊",
          timestamp: new Date().toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
      await loadConversations(); // 목록 새로고침
    } catch (error) {
      console.error("Failed to create conversation:", error);
      toast({
        title: "오류",
        description: "대화방 생성에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  // 대화 선택
  const selectConversation = async (convId: number) => {
    try {
      setConversationId(convId);
      
      // 비회원인 경우 (음수 conversationId)
      if (convId < 0) {
        const guestMessages = loadGuestMessages(convId);
        setMessages(guestMessages);
        return;
      }
      
      // 회원인 경우
      const history = await getConversationHistory(convId);

      // 메시지 변환
      const loadedMessages: Message[] = history.messages.map((msg) => {
        // messageSources (JSON 문자열)을 파싱
        let sources: Source[] | undefined;
        if (msg.messageSources) {
          try {
            sources = JSON.parse(msg.messageSources);
          } catch (e) {
            console.error("Failed to parse sources:", e);
          }
        }

        return {
          id: msg.messageId.toString(),
          role: msg.messageRole === "USER" ? "user" : "assistant",
          content: msg.messageContent,
          timestamp: new Date(msg.messageCreatedAt).toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          sources,
        };
      });

      setMessages(loadedMessages);
    } catch (error) {
      console.error("Failed to load conversation:", error);
      toast({
        title: "오류",
        description: "대화를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  // 대화 삭제
  const handleDeleteConversation = async (convId: number) => {
    try {
      // 비회원인 경우 (음수 conversationId)
      if (convId < 0) {
        deleteGuestConversation(convId);
        await loadConversations();

        // 현재 선택된 대화가 삭제된 경우
        if (conversationId === convId) {
          setConversationId(null);
          setMessages([]);
        }

        toast({
          title: "성공",
          description: "대화가 삭제되었습니다.",
        });
        return;
      }
      
      // 회원인 경우
      await deleteConversation(convId);
      await loadConversations();

      // 현재 선택된 대화가 삭제된 경우
      if (conversationId === convId) {
        setConversationId(null);
        setMessages([]);
      }

      toast({
        title: "성공",
        description: "대화가 삭제되었습니다.",
      });
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      toast({
        title: "오류",
        description: "대화 삭제에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  // 로그인 상태 변화 감지 (로그인/로그아웃 감지)
  useEffect(() => {
    const handleLoginStatusChange = () => {
      const userId = getCurrentUserId();
      
      if (!userId) {
        // 로그아웃된 경우 (userId가 없음) - 비회원 상태로 전환
        // 상태 초기화 (회원 대화는 없애고 비회원 대화만 표시)
        const guestConvs = loadGuestConversations();
        setConversations(guestConvs);
        
        // 현재 선택된 대화가 회원 대화인 경우 초기화
        if (conversationId && conversationId > 0) {
          setConversationId(null);
          setMessages([]);
        }
        
        setInitialQuery(null);
        setIsLoading(false);
        
        // 비회원 채팅 허용 - 리다이렉트하지 않음
      } else {
        // 로그인된 경우 (userId가 있음) - 대화 목록 다시 불러오기
        loadConversations();
      }
    };

    // loginStatusChanged 이벤트 리스너 추가
    window.addEventListener('loginStatusChanged', handleLoginStatusChange);
    
    // storage 이벤트 리스너 추가 (다른 탭에서 로그인/로그아웃 시)
    window.addEventListener('storage', handleLoginStatusChange);

    return () => {
      window.removeEventListener('loginStatusChanged', handleLoginStatusChange);
      window.removeEventListener('storage', handleLoginStatusChange);
    };
  }, [navigate, conversationId]);

  useEffect(() => {
    // 초기화: 대화 목록 불러오기
    const init = async () => {
      // 로그인 상태 확인
      const userId = getCurrentUserId();
      
      if (!userId) {
        // 비회원인 경우 sessionStorage에서 대화 목록 불러오기
        const guestConvs = loadGuestConversations();
        setConversations(guestConvs);

        // URL 쿼리로 전달된 질문이 있으면 새 대화 시작
        const query = searchParams.get("q");
        if (query) {
          setInitialQuery(query);
          setSearchParams({});
          await startNewConversation();
        } else if (guestConvs.length > 0) {
          // 쿼리가 없으면 가장 최근 대화 자동 선택
          await selectConversation(guestConvs[0].conversationId);
        }
        return;
      }

      try {
        // 대화 목록 불러오기
        const convs = await getUserConversations();

        // 제목이 있는 대화만 필터링 & 중복 제목 제거
        const validConvs = convs.filter(c => c.conversationTitle && c.conversationTitle.trim() !== "");
        const uniqueConvs = validConvs.reduce((acc, conv) => {
          const existing = acc.find(c => c.conversationTitle === conv.conversationTitle);
          if (!existing) {
            acc.push(conv);
          }
          return acc;
        }, [] as ConversationResponse[]);

        setConversations(uniqueConvs);

        // URL 쿼리로 전달된 질문이 있으면 새 대화 시작
        const query = searchParams.get("q");
        if (query) {
          setInitialQuery(query);
          // URL에서 쿼리 파라미터 제거 (새로고침 시 중복 방지)
          setSearchParams({});
          await startNewConversation();
        } else if (uniqueConvs.length > 0) {
          // 쿼리가 없으면 가장 최근 대화 자동 선택
          await selectConversation(uniqueConvs[0].conversationId);
        }
      } catch (error) {
        console.error("Failed to initialize:", error);
        // 에러 발생 시 상태 초기화
        setConversations([]);
        setMessages([]);
        setConversationId(null);
      }
    };

    init();
  }, []);

  // conversationId와 initialQuery가 모두 준비되면 자동 전송
  useEffect(() => {
    if (conversationId && initialQuery) {
      handleSend(initialQuery);
      setInitialQuery(null); // 한 번만 전송
    }
  }, [conversationId, initialQuery]);

  const handleSend = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim()) {
      return;
    }

    // 로그인 상태 확인
    const userId = getCurrentUserId();
    const isGuest = !userId;

    // conversationId가 없으면 새 대화 생성
    let currentConversationId = conversationId;
    if (!currentConversationId) {
      if (isGuest) {
        // 비회원인 경우 sessionStorage에 새 대화 생성
        const guestConvId = generateGuestConversationId();
        const now = new Date().toISOString();
        const newConversation: ConversationResponse = {
          conversationId: guestConvId,
          conversationTitle: "새 대화",
          conversationCreatedAt: now,
          conversationUpdatedAt: now,
        };
        
        const guestConvs = loadGuestConversations();
        guestConvs.unshift(newConversation);
        saveGuestConversations(guestConvs);
        
        currentConversationId = guestConvId;
        setConversationId(currentConversationId);
        
        // 환영 메시지 추가
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content: "안녕하세요! 청년 정책에 대해 무엇이든 물어보세요. 😊",
            timestamp: new Date().toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
        
        await loadConversations();
      } else {
        try {
          const newConversation = await createConversation({
            conversationTitle: "새 대화",
          });
          currentConversationId = newConversation.conversationId;
          setConversationId(currentConversationId);
          
          // 환영 메시지 추가
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              content: "안녕하세요! 청년 정책에 대해 무엇이든 물어보세요. 😊",
              timestamp: new Date().toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
          ]);
          
          await loadConversations();
        } catch (error) {
          console.error("Failed to create conversation:", error);
          toast({
            title: "오류",
            description: "대화방 생성에 실패했습니다.",
            variant: "destructive",
          });
          return;
        }
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date().toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // AI 응답을 스트리밍으로 받기
    let aiResponse = "";
    const aiMessageId = (Date.now() + 1).toString();
    let messageAdded = false; // AI 메시지 추가 여부 플래그
    let sources: Source[] = []; // 웹 검색 출처

    try {
      await sendMessageStream(
        {
          conversationId: currentConversationId,
          message: messageText,
        },
        // onChunk: 스트리밍 데이터 수신
        (chunk: string) => {
          try {
            const data = JSON.parse(chunk);
            console.log("📦 Received chunk:", data);

            // 웹 검색 출처 수신
            if (data.type === "sources" && data.sources) {
              console.log("🔗 Sources received:", data.sources);
              sources = data.sources;
            }

            // AI 서비스가 보내는 "content" 타입 처리
            if (data.type === "content" && data.content) {
              aiResponse += data.content;

              // 첫 content가 왔을 때 AI 메시지 추가
              if (!messageAdded) {
                messageAdded = true;
                const aiMessage: Message = {
                  id: aiMessageId,
                  role: "assistant",
                  content: aiResponse,
                  timestamp: new Date().toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  sources: sources.length > 0 ? sources : undefined,
                };
                setMessages((prev) => [...prev, aiMessage]);
              } else {
                // 실시간으로 메시지 업데이트
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMessageId
                      ? { ...msg, content: aiResponse, sources: sources.length > 0 ? sources : undefined }
                      : msg
                  )
                );
              }
            }
          } catch (e) {
            console.error("Failed to parse chunk:", e);
          }
        },
        // onComplete
        () => {
          setIsLoading(false);
          
          // 비회원인 경우 sessionStorage에 메시지 저장
          if (isGuest && currentConversationId) {
            // 상태 업데이트 후 메시지 저장 (setTimeout으로 지연)
            setTimeout(() => {
              setMessages((currentMessages) => {
                saveGuestMessages(currentConversationId, currentMessages);
                
                // 첫 메시지인 경우 대화 제목 업데이트
                const guestConvs = loadGuestConversations();
                const conv = guestConvs.find(c => c.conversationId === currentConversationId);
                if (conv && conv.conversationTitle === "새 대화") {
                  const newTitle = messageText.length > 30
                    ? messageText.substring(0, 30) + "..."
                    : messageText;
                  conv.conversationTitle = newTitle;
                  saveGuestConversations(guestConvs);
                }
                
                return currentMessages;
              });
            }, 100);
          }
          
          // 메시지 전송 완료 후 대화 목록 갱신 (제목 업데이트 반영)
          loadConversations();
        },
        // onError
        (error: Error) => {
          console.error("Streaming error:", error);
          setIsLoading(false);
          toast({
            title: "오류",
            description: "메시지 전송에 실패했습니다.",
            variant: "destructive",
          });
        }
      );
    } catch (error) {
      console.error("Failed to send message:", error);
      setIsLoading(false);
      toast({
        title: "오류",
        description: "메시지 전송에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const quickQuestions = [
    "청년도약계좌 조건이 어떻게 되나요?",
    "전세자금대출 신청 방법은?",
    "취업 지원금 받을 수 있나요?",
  ];

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header />

      <main className="flex-1 overflow-hidden flex">
        {/* Sidebar - Conversation History */}
        <aside className="w-64 border-r bg-muted/10 flex flex-col">
          {/* New Chat Button */}
          <div className="p-3 border-b">
            <Button
              onClick={startNewConversation}
              className="w-full justify-start gap-2"
              variant="outline"
            >
              <Plus className="w-4 h-4" />새 대화
            </Button>
          </div>

          {/* Conversation List */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {conversations.map((conv) => (
                <div
                  key={conv.conversationId}
                  className={`group flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-accent transition-colors ${
                    conversationId === conv.conversationId ? "bg-accent" : ""
                  }`}
                  onClick={() => selectConversation(conv.conversationId)}
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-sm truncate">
                    {conv.conversationTitle}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConversation(conv.conversationId);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* Chat Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            <div className="container max-w-4xl px-4 py-6 space-y-6">
            {messages.map((message) => (
              <div key={message.id} className="space-y-4">
                <ChatMessage
                  role={message.role}
                  content={message.content}
                  timestamp={message.timestamp}
                  sources={message.sources}
                />
                {message.policies && message.policies.length > 0 && (
                  <div className="space-y-2 ml-11">
                    <p className="text-sm font-medium text-muted-foreground">관련 정책</p>
                    <div className="grid gap-3">
                      {message.policies.map((policy) => (
                        <PolicyCard
                          key={policy.faqId}
                          id={policy.faqId.toString()}
                          title={policy.faqQuestion}
                          category={policy.categoryName}
                          summary={policy.faqAnswer}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary-foreground animate-pulse" />
                </div>
                <Card className="p-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </Card>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Quick Questions */}
        {messages.length <= 1 && (
          <div className="container max-w-4xl px-4 pb-4">
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((question, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSend(question)}
                  className="text-xs"
                  disabled={isLoading}
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t bg-background/95 backdrop-blur">
          <div className="container max-w-4xl px-4 py-4">
            <Card className="p-2">
              <div className="flex gap-2">
                <Input
                  placeholder="청년 정책에 대해 무엇이든 물어보세요..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  className="border-0 focus-visible:ring-0"
                  disabled={isLoading}
                />
                <Button
                  onClick={() => handleSend()}
                  size="icon"
                  disabled={!input.trim() || isLoading}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
};

export default Chat;
