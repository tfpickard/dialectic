import { NextRequest } from "next/server";
import { WebSocket, WebSocketServer } from "ws";
import { WSClientMessage, WSServerMessage } from "@/lib/types";

// Store active connections and their states
const connections = new Map<
  WebSocket,
  {
    roomId: string;
    isRunning: boolean;
    intervalId?: NodeJS.Timeout;
  }
>();

// Create WebSocket server instance
let wss: WebSocketServer | null = null;

function getWSS(): WebSocketServer {
  if (!wss) {
    wss = new WebSocketServer({ noServer: true });

    wss.on("connection", (ws: WebSocket) => {
      console.log("New WebSocket connection");

      // Initialize connection state
      connections.set(ws, {
        roomId: "",
        isRunning: false,
      });

      ws.on("message", async (data: Buffer) => {
        try {
          const message: WSClientMessage = JSON.parse(data.toString());
          const connState = connections.get(ws);

          if (!connState) return;

          switch (message.type) {
            case "init":
              // Initialize room
              connState.roomId = message.roomId;

              // Fetch history from Python API
              try {
                const historyUrl = `${getBaseUrl()}/api/debate/history?room_id=${message.roomId}`;
                const historyRes = await fetch(historyUrl);

                if (historyRes.ok) {
                  const historyData = await historyRes.json();
                  const historyMsg: WSServerMessage = {
                    type: "history",
                    messages: historyData.messages || [],
                  };
                  ws.send(JSON.stringify(historyMsg));
                } else {
                  // Room doesn't exist yet, send empty history
                  const historyMsg: WSServerMessage = {
                    type: "history",
                    messages: [],
                  };
                  ws.send(JSON.stringify(historyMsg));
                }
              } catch (error) {
                console.error("Error fetching history:", error);
                const errorMsg: WSServerMessage = {
                  type: "error",
                  message: "Failed to fetch debate history",
                };
                ws.send(JSON.stringify(errorMsg));
              }
              break;

            case "user_prompt":
              // User sent a prompt, trigger a debate step
              await triggerDebateStep(ws, connState.roomId, message.content);
              break;

            case "pause":
              // Stop the automatic debate loop
              if (connState.intervalId) {
                clearInterval(connState.intervalId);
                connState.intervalId = undefined;
              }
              connState.isRunning = false;

              const pauseMsg: WSServerMessage = {
                type: "status",
                isRunning: false,
              };
              ws.send(JSON.stringify(pauseMsg));
              break;

            case "resume":
              // Start the automatic debate loop
              if (!connState.isRunning) {
                connState.isRunning = true;

                const resumeMsg: WSServerMessage = {
                  type: "status",
                  isRunning: true,
                };
                ws.send(JSON.stringify(resumeMsg));

                // Initial debate step
                await triggerDebateStep(ws, connState.roomId);

                // Set up periodic debate steps
                connState.intervalId = setInterval(async () => {
                  if (connState.isRunning) {
                    await triggerDebateStep(ws, connState.roomId);
                  }
                }, 3000); // 3 seconds between rounds
              }
              break;
          }
        } catch (error) {
          console.error("Error handling WebSocket message:", error);
          const errorMsg: WSServerMessage = {
            type: "error",
            message: "Failed to process message",
          };
          ws.send(JSON.stringify(errorMsg));
        }
      });

      ws.on("close", () => {
        console.log("WebSocket connection closed");
        const connState = connections.get(ws);
        if (connState?.intervalId) {
          clearInterval(connState.intervalId);
        }
        connections.delete(ws);
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
      });
    });
  }

  return wss;
}

async function triggerDebateStep(
  ws: WebSocket,
  roomId: string,
  userPrompt?: string
) {
  try {
    const stepUrl = `${getBaseUrl()}/api/debate/step`;
    const stepRes = await fetch(stepUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        room_id: roomId,
        user_prompt: userPrompt,
      }),
    });

    if (stepRes.ok) {
      const stepData = await stepRes.json();
      const newMessagesMsg: WSServerMessage = {
        type: "new_messages",
        messages: stepData.newMessages || [],
      };
      ws.send(JSON.stringify(newMessagesMsg));
    } else {
      const errorText = await stepRes.text();
      console.error("Debate step failed:", errorText);
      const errorMsg: WSServerMessage = {
        type: "error",
        message: `Failed to generate debate step: ${errorText}`,
      };
      ws.send(JSON.stringify(errorMsg));
    }
  } catch (error) {
    console.error("Error triggering debate step:", error);
    const errorMsg: WSServerMessage = {
      type: "error",
      message: "Failed to trigger debate step",
    };
    ws.send(JSON.stringify(errorMsg));
  }
}

function getBaseUrl(): string {
  // In production, use the deployment URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  // In development, use localhost
  return "http://localhost:3000";
}

export async function GET(request: NextRequest) {
  // Check if this is a WebSocket upgrade request
  const upgrade = request.headers.get("upgrade");

  if (upgrade?.toLowerCase() === "websocket") {
    // Get the underlying socket from the request
    const socket = (request as any).socket;
    const head = (request as any).head || Buffer.alloc(0);

    if (!socket) {
      return new Response("WebSocket upgrade failed - no socket", { status: 400 });
    }

    // Upgrade the connection
    const wss = getWSS();
    wss.handleUpgrade(request as any, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });

    return new Response(null, { status: 101 });
  }

  return new Response("Expected WebSocket upgrade", { status: 426 });
}
