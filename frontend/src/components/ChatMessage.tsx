import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { User, Compass, ExternalLink } from "lucide-react";

interface Source {
  title: string;
  url: string;
  score: number;
}

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  sources?: Source[];
}

const ChatMessage = ({ role, content, timestamp, sources }: ChatMessageProps) => {
  const isUser = role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <Avatar className={`w-8 h-8 shrink-0 ${isUser ? "bg-muted" : "bg-primary"}`}>
        {isUser ? (
          <User className="w-5 h-5 text-muted-foreground" />
        ) : (
          <Compass className="w-5 h-5 text-primary-foreground" />
        )}
      </Avatar>

      <div className={`flex flex-col gap-2 max-w-[80%] ${isUser ? "items-end" : ""}`}>
        <Card className={`p-3 ${isUser ? "bg-primary text-primary-foreground" : "bg-card"}`}>
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        </Card>

        {/* 웹 검색 출처 표시 */}
        {!isUser && sources && sources.length > 0 && (
          <div className="flex flex-col gap-1 px-1">
            <span className="text-xs font-medium text-muted-foreground">참고 자료:</span>
            {sources.map((source, index) => (
              <a
                key={index}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                <span className="truncate max-w-[300px]">{source.title || source.url}</span>
              </a>
            ))}
          </div>
        )}

        {timestamp && (
          <span className="text-xs text-muted-foreground px-1">{timestamp}</span>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
