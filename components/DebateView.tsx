"use client";

import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import ChatMessage from "./ChatMessage";
import { Message } from "@/lib/types";

export default function DebateView() {
  const [roomId, setRoomId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize room ID from localStorage or create new one
  useEffect(() => {
    const storedRoomId = localStorage.getItem("dialectic_room_id");
    if (storedRoomId) {
      setRoomId(storedRoomId);
    } else {
      const newRoomId = uuidv4();
      localStorage.setItem("dialectic_room_id", newRoomId);
      setRoomId(newRoomId);
    }
  }, []);

  // Fetch history when room ID is set
  useEffect(() => {
    if (!roomId) return;

    const fetchHistory = async () => {
      try {
        const response = await fetch(`/api/debate/history?room_id=${roomId}`);
        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.error("Failed to fetch history:", err);
      }
    };

    fetchHistory();
  }, [roomId]);

  // Polling logic for automatic debate rounds
  useEffect(() => {
    if (!isRunning || !roomId) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Start polling
    const runDebateStep = async () => {
      if (isLoading) return; // Prevent overlapping requests

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/debate/step", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            room_id: roomId,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.newMessages && data.newMessages.length > 0) {
            setMessages((prev) => [...prev, ...data.newMessages]);
          }
        } else {
          const errorText = await response.text();
          setError(`API error: ${errorText}`);
        }
      } catch (err) {
        console.error("Debate step error:", err);
        setError("Failed to generate debate step");
      } finally {
        setIsLoading(false);
      }
    };

    // Run initial step immediately
    runDebateStep();

    // Then set up polling interval
    pollingIntervalRef.current = setInterval(runDebateStep, 4000); // 4 seconds between rounds

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [isRunning, roomId, isLoading]);

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    const userPrompt = userInput.trim();

    // Optimistically add user message to UI
    const userMessage: Message = {
      id: uuidv4(),
      author: "user",
      content: userPrompt,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setUserInput("");

    // Trigger debate step with user prompt
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/debate/step", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          room_id: roomId,
          user_prompt: userPrompt,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.newMessages && data.newMessages.length > 0) {
          setMessages((prev) => [...prev, ...data.newMessages]);
        }
      } else {
        const errorText = await response.text();
        setError(`API error: ${errorText}`);
      }
    } catch (err) {
      console.error("User prompt error:", err);
      setError("Failed to process your prompt");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewRoom = () => {
    const newRoomId = uuidv4();
    localStorage.setItem("dialectic_room_id", newRoomId);
    setRoomId(newRoomId);
    setMessages([]);
    setIsRunning(false);
    setError(null);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleResume = () => {
    setIsRunning(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
      {/* Main chat area - left/center column */}
      <div className="lg:col-span-3 bg-gray-800/50 rounded-lg shadow-2xl border border-gray-700 flex flex-col h-[80vh]">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-20">
              <p className="text-lg mb-2">The debate chamber awaits...</p>
              <p className="text-sm">
                Click &quot;Resume argument&quot; to start the dialectic, or inject your
                own prompt below.
              </p>
            </div>
          )}
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* User input area */}
        <div className="border-t border-gray-700 p-4 bg-gray-900/50">
          <form onSubmit={handleUserSubmit} className="flex gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Guide the argument... (e.g., 'Debate tabs vs spaces')"
              className="flex-1 bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !userInput.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {isLoading ? "..." : "Send"}
            </button>
          </form>
        </div>
      </div>

      {/* Controls panel - right column */}
      <div className="lg:col-span-1 space-y-4">
        {/* Status card */}
        <div className="bg-gray-800/50 rounded-lg shadow-lg border border-gray-700 p-6">
          <h3 className="text-lg font-bold text-white mb-4">Status</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full bg-green-500`} />
              <span className="text-sm text-gray-300">Ready</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isRunning ? "bg-yellow-500 animate-pulse" : "bg-gray-500"
                }`}
              />
              <span className="text-sm text-gray-300">
                {isRunning ? "Arguing..." : "Paused"}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-700">
              Room: {roomId.slice(0, 8)}...
            </div>
          </div>
        </div>

        {/* Controls card */}
        <div className="bg-gray-800/50 rounded-lg shadow-lg border border-gray-700 p-6">
          <h3 className="text-lg font-bold text-white mb-4">Controls</h3>
          <div className="space-y-3">
            {!isRunning ? (
              <button
                onClick={handleResume}
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg font-medium transition-colors"
              >
                Resume argument
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
              >
                Pause argument
              </button>
            )}
            <button
              onClick={handleNewRoom}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
            >
              Start new room
            </button>
          </div>
        </div>

        {/* Info card */}
        <div className="bg-gray-800/50 rounded-lg shadow-lg border border-gray-700 p-6">
          <h3 className="text-lg font-bold text-white mb-3">About</h3>
          <div className="text-xs text-gray-400 space-y-2">
            <p>
              <span className="text-blue-400 font-semibold">Agent Alpha:</span>{" "}
              Hyper-logical contrarian
            </p>
            <p>
              <span className="text-red-400 font-semibold">Agent Beta:</span>{" "}
              Emotional rhetorician
            </p>
            <p className="pt-2 border-t border-gray-700">
              These agents are programmed to disagree on everything. If they
              reach a stalemate, they&apos;ll pivot to a new topic.
            </p>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
