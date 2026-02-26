import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useRef, useEffect } from "react";
import { Send, MessageCircle, PartyPopper, TrendingUp } from "lucide-react";

interface LiveChatProps {
  roomId: string;
  compact?: boolean;
}

export default function LiveChat({ roomId, compact = false }: LiveChatProps) {
  const { isAuthenticated } = useAuth();
  const messagesQuery = trpc.chat.messages.useQuery(
    { roomId, limit: 100 },
    { refetchInterval: 3000 }
  );
  const sendMessage = trpc.chat.send.useMutation({
    onSuccess: () => {
      setMsg("");
      messagesQuery.refetch();
    },
  });

  const [msg, setMsg] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messageType, setMessageType] = useState<"chat" | "cheer" | "prediction">("chat");

  const messages = messagesQuery.data || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = () => {
    if (!msg.trim()) return;
    sendMessage.mutate({ roomId, message: msg.trim(), messageType });
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case "cheer": return <PartyPopper className="w-3 h-3 text-yellow-400 inline mr-1" />;
      case "prediction": return <TrendingUp className="w-3 h-3 text-green-400 inline mr-1" />;
      default: return null;
    }
  };

  const getMessageColor = (type: string) => {
    switch (type) {
      case "cheer": return "text-yellow-300";
      case "prediction": return "text-green-300";
      default: return "text-foreground";
    }
  };

  return (
    <div className={`flex flex-col bg-card/80 border border-primary/20 rounded-xl overflow-hidden ${compact ? "h-64" : "h-96"}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border-b border-primary/20">
        <MessageCircle className="w-4 h-4 text-primary" />
        <span className="text-sm font-bold">Live Chat</span>
        <span className="text-xs text-muted-foreground ml-auto">{messages.length} messages</span>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-2" ref={scrollRef as any}>
        <div className="space-y-1">
          {messages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No messages yet. Be the first!</p>
          ) : (
            messages.map((m: any) => (
              <div key={m.id} className="text-xs">
                {getMessageIcon(m.messageType)}
                <span className="font-bold text-primary/80">{m.userName}: </span>
                <span className={getMessageColor(m.messageType)}>{m.message}</span>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      {isAuthenticated ? (
        <div className="p-2 border-t border-primary/20">
          <div className="flex gap-1 mb-1">
            {(["chat", "cheer", "prediction"] as const).map(type => (
              <button
                key={type}
                onClick={() => setMessageType(type)}
                className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                  messageType === type
                    ? "bg-primary text-primary-foreground"
                    : "bg-background/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                {type === "chat" ? "💬" : type === "cheer" ? "🎉" : "📈"} {type}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <Input
              value={msg}
              onChange={e => setMsg(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              placeholder="Type a message..."
              className="text-xs h-8 bg-background/50"
              maxLength={500}
            />
            <Button size="sm" className="h-8 px-2" onClick={handleSend} disabled={sendMessage.isPending || !msg.trim()}>
              <Send className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-2 border-t border-primary/20 text-center">
          <p className="text-xs text-muted-foreground">Sign in to chat</p>
        </div>
      )}
    </div>
  );
}
