import { Message } from "@/lib/types";

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isAlpha = message.author === "alpha";
  const isBeta = message.author === "beta";
  const isUser = message.author === "user";

  const getAuthorLabel = () => {
    if (isAlpha) return "Agent Alpha";
    if (isBeta) return "Agent Beta";
    return "Moderator";
  };

  const getAuthorColor = () => {
    if (isAlpha) return "bg-blue-600";
    if (isBeta) return "bg-red-600";
    return "bg-green-600";
  };

  const getMessageBgColor = () => {
    if (isAlpha) return "bg-blue-900/30 border-blue-700/50";
    if (isBeta) return "bg-red-900/30 border-red-700/50";
    return "bg-green-900/30 border-green-700/50";
  };

  const getAlignment = () => {
    if (isAlpha) return "justify-start";
    if (isBeta) return "justify-end";
    return "justify-center";
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className={`flex ${getAlignment()} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? "max-w-[60%]" : ""}`}>
        <div className="flex items-center gap-2 mb-1">
          {/* Avatar circle */}
          <div
            className={`w-8 h-8 rounded-full ${getAuthorColor()} flex items-center justify-center text-white text-sm font-bold ${
              isBeta ? "order-2" : ""
            }`}
          >
            {message.author === "alpha" && "A"}
            {message.author === "beta" && "B"}
            {message.author === "user" && "M"}
          </div>
          {/* Author label */}
          <div
            className={`text-xs text-gray-400 font-medium ${
              isBeta ? "order-1" : ""
            }`}
          >
            {getAuthorLabel()}
          </div>
          {/* Timestamp */}
          <div
            className={`text-xs text-gray-500 ${isBeta ? "order-0 mr-auto" : "ml-auto"}`}
          >
            {formatTime(message.timestamp)}
          </div>
        </div>
        {/* Message bubble */}
        <div
          className={`p-4 rounded-lg border ${getMessageBgColor()} ${
            isBeta ? "text-right" : ""
          }`}
        >
          <p className="text-gray-100 whitespace-pre-wrap leading-relaxed">
            {message.content}
          </p>
        </div>
      </div>
    </div>
  );
}
