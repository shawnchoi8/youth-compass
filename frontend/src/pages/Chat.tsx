import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import ChatMessage from "@/components/ChatMessage";
import PolicyCard from "@/components/PolicyCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  createConversation,
  sendMessageStream,
  FaqResponse,
} from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  policies?: FaqResponse[];
}

const Chat = () => {
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [initialQuery, setInitialQuery] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // 대화방 생성
    const initConversation = async () => {
      try {
        const conversation = await createConversation({
          title: "새 대화",
        });
        setConversationId(conversation.conversationId);

        // Welcome message
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

        // URL 쿼리로 전달된 질문 확인
        const query = searchParams.get("q");
        if (query) {
          setInitialQuery(query);
        }
      } catch (error) {
        console.error("Failed to create conversation:", error);
        toast({
          title: "오류",
          description: "대화방 생성에 실패했습니다.",
          variant: "destructive",
        });
      }
    };

    initConversation();
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

      <main className="flex-1 overflow-hidden flex flex-col">
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
      </main>
    </div>
  );
};

export default Chat;
