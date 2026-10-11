import { api, LIVE_MODE } from "../../services/api";
import React, { useState } from "react";
import {
  Sparkles,
  Send,
  Bot,
  User,
  X,
  BrainCircuit,
  Terminal,
} from "lucide-react";
import { Tanker, Ward, FraudAnomaly } from "../../types";

interface Message {
  id: string;
  sender: "user" | "assistant" | "system";
  text: string;
  toolCall?: {
    name: string;
    input: any;
    output: any;
  };
  timestamp: string;
}

interface BedrockCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  fleet?: Tanker[];
  wards?: Ward[];
  anomalies?: FraudAnomaly[];
}

export const BedrockCopilotDrawer: React.FC<BedrockCopilotDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-1",
      sender: "assistant",
      text: import.meta.env.PROD ? "Ask about your current fleet, requests and recorded water deliveries. Answers use the current operational records." : "Ask about water operations. In AWS mode, responses use the current database snapshot. In demo mode, responses are illustrative examples.",
      timestamp: "Just now",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const quickPrompts = [
    "Which wards in Delhi have the highest water deficit?",
    "Which pending requests have the highest urgency?",
    "How does JAL-SETU catch water tanker theft?",
    "Which tankers are available for dispatch?",
  ];

  const handleSend = async (textToSend?: string) => {
    if (isTyping) return;
    const prompt = textToSend || input;
    if (!prompt.trim()) return;

    // Timestamps are created only in this user-event handler.
    const userMsg: Message = {
      id: crypto.randomUUID(),
      sender: "user",
      text: prompt,
      timestamp: "Now",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    if (import.meta.env.PROD || LIVE_MODE) {
      try {
        const result = await api("/copilot", { question: prompt });
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            sender: "assistant",
            text: result.answer,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            sender: "system",
            text: (e as Error).message,
            timestamp: "Now",
          },
        ]);
      } finally {
        setIsTyping(false);
      }
      return;
    }
    // AI reasoning simulation
    setTimeout(() => {
      let replyText = "";
      let toolCall = undefined;

      const lower = prompt.toLowerCase();
      if (
        lower.includes("highest") ||
        lower.includes("deficit") ||
        lower.includes("wards")
      ) {
        replyText =
          "Based on our live telemetry and citizen surge queues, **Sangam Vihar & Deoli (Ward 01)** and **Najafgarh (Ward 07)** have the highest water deficit. Sangam Vihar has 18 active requests with an average of 4.2 days without piped water and a groundwater depletion score of 94/100. I recommend prioritizing Tanker `DL-01-TK-101` from the Mehrauli Booster Depot.";
        toolCall = {
          name: "bedrock_query_ward_metrics",
          input: { zone: "Delhi-NCR", minSeverity: "CRITICAL" },
          output: {
            topDeficitWards: ["Sangam Vihar", "Najafgarh", "Mehrauli"],
            unservedCitizens: 1240,
          },
        };
      } else if (
        lower.includes("req-101") ||
        lower.includes("sangam vihar") ||
        lower.includes("score")
      ) {
        replyText =
          "Request `REQ-101` received an Urgency Score of **94/100 (CRITICAL_EMERGENCY)** due to 3 compound factors:\n1. **4 consecutive days** with zero piped supply (Weight: 35%)\n2. **8 high-vulnerability residents** (infants & elderly) reported by RWA Secretary Sunita Sharma (Weight: 35%)\n3. Critical keywords identified in Hindi voice transcript: *'community tank dry, medical clinic hydration'* (Weight: 30%).";
        toolCall = {
          name: "bedrock_classify_nlp_urgency",
          input: { requestId: "REQ-101", model: "Claude-3.5-Sonnet" },
          output: {
            urgencyScore: 94,
            tier: "CRITICAL_EMERGENCY",
            confidence: 0.98,
          },
        };
      } else if (
        lower.includes("theft") ||
        lower.includes("fraud") ||
        lower.includes("ghost")
      ) {
        replyText =
          "JAL-SETU catches water theft through our **Multi-Factor Proof of Delivery (PoD) and Fraud Sentinel**:\n- **3-Way Handshake**: A delivery is only marked valid if the driver inputs the resident's dynamic 6-digit OTP while their GPS is within 200m of the delivery pin.\n- **Dwell Time Telemetry**: If a 10,000L tanker empties in under 3 minutes (short-pour), an **AWS EventBridge** anomaly alarm is instantly triggered.";
      } else {
        replyText = `Analyzing municipal data with Amazon Bedrock... I've cross-referenced current VRP routes with 25 DJB booster depots. All critical SLA requests are scheduled for delivery within the next 1.8 hours.`;
      }

      const assistantMsg: Message = {
        id: `ast-${Date.now()}`,
        sender: "assistant",
        text: replyText,
        toolCall,
        timestamp: "Now",
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 700);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-white/98 backdrop-blur-2xl border-l border-slate-200 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
            <Sparkles className="w-5 h-5 text-emerald-600 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Amazon Bedrock Copilot
              <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold">
                {LIVE_MODE ? "Bedrock" : "Demo responses"}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Multilingual fleet intelligence & urgent triage
            </p>
          </div>
        </div>

        <button
          aria-label="Close copilot"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAF9F5]/40">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 text-xs ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.sender === "assistant" && (
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-3.5 space-y-2 shadow-xs ${
                msg.sender === "user"
                  ? "bg-[#D9532F] text-white font-medium ml-auto"
                  : "bg-white text-slate-800 border border-slate-200"
              }`}
            >
              <div className="whitespace-pre-wrap leading-relaxed">
                {msg.text}
              </div>

              {/* Tool Execution Box */}
              {msg.toolCall && (
                <div className="mt-2 p-2 rounded-lg bg-slate-900 font-mono text-xs text-emerald-300">
                  <div className="flex items-center gap-1.5 text-emerald-300 font-bold mb-1">
                    <Terminal className="w-3 h-3" />
                    <span>Tool Action: {msg.toolCall.name}</span>
                  </div>
                  <pre className="text-slate-300 overflow-x-auto text-xs">
                    {JSON.stringify(msg.toolCall.output, null, 2)}
                  </pre>
                </div>
              )}

              <div
                className={`text-xs text-right font-mono ${msg.sender === "user" ? "text-orange-200" : "text-slate-400"}`}
              >
                {msg.timestamp}
              </div>
            </div>

            {msg.sender === "user" && (
              <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center flex-shrink-0 font-bold mt-0.5 shadow-xs">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-mono bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 w-fit">
            <BrainCircuit className="w-4 h-4 animate-spin text-emerald-600" />
            <span>Amazon Bedrock is analyzing the current snapshot...</span>
          </div>
        )}
      </div>

      {/* Quick Suggestions */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex gap-2 overflow-x-auto">
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            className="text-xs px-2.5 py-1 rounded-full bg-white hover:bg-orange-50 text-slate-700 hover:text-[#D9532F] border border-slate-200 whitespace-nowrap transition shadow-xs"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <div className="p-3 bg-white border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Bedrock Copilot in Hindi or English..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#D9532F]"
          />
          <button
            type="submit"
            className="p-2 rounded-xl btn-terracotta text-white font-bold transition shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
