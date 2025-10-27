import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { User, Compass } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

const ChatMessage = ({ role, content, timestamp }: ChatMessageProps) => {
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

      <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? "items-end" : ""}`}>
        <Card className={`p-3 ${isUser ? "bg-primary text-primary-foreground" : "bg-card"}`}>
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        </Card>
        {timestamp && (
          <span className="text-xs text-muted-foreground px-1">{timestamp}</span>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
