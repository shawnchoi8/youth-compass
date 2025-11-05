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

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  policies?: FaqResponse[];
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
    }
  };

  // 새 대화 시작
  const startNewConversation = async () => {
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
      const history = await getConversationHistory(convId);

      // 메시지 변환
      const loadedMessages: Message[] = history.messages.map((msg) => ({
        id: msg.messageId.toString(),
        role: msg.messageRole === "USER" ? "user" : "assistant",
        content: msg.messageContent,
        timestamp: new Date(msg.messageCreatedAt).toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }));

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

  useEffect(() => {
    // 초기화: 대화 목록 불러오기
    const init = async () => {
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
    if (!messageText.trim() || !conversationId) {
      return;
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

    try {
      await sendMessageStream(
        {
          conversationId,
          message: messageText,
        },
        // onChunk: 스트리밍 데이터 수신
        (chunk: string) => {
          try {
            const data = JSON.parse(chunk);

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
                };
                setMessages((prev) => [...prev, aiMessage]);
              } else {
                // 실시간으로 메시지 업데이트
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMessageId
                      ? { ...msg, content: aiResponse }
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
