"use client";
import { useState } from "react";
import { Send, Bot, Loader2 } from "lucide-react";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

export function AIHelper() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            role: "assistant",
            content: "Hello! I'm your AI assistant for the booking system. I can help you with:\n\n• Answering questions about bookings\n• Generating reports\n• Providing occupancy insights\n• Managing content\n\nWhat would you like help with?",
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch('/api/ai-chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: input }),
            });

            if (!response.ok) {
                throw new Error('Failed to get AI response');
            }

            const data = await response.json();

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: data.message,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, assistantMessage]);
            setIsLoading(false);
        } catch (error) {
            console.error("Error sending message:", error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "Sorry, I encountered an error. Please try again later.",
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                    <Bot className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-slate-900">AI Assistant</h2>
                    <p className="text-sm text-slate-600">Get help with bookings, reports, and insights</p>
                </div>
            </div>

            {/* Chat Container */}
            <div className="flex-1 bg-white rounded-lg border border-slate-200 overflow-hidden">
                {/* Messages */}
                <div className="flex-1 p-4 space-y-4 max-h-96 overflow-y-auto">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"
                                }`}
                        >
                            {message.role === "assistant" && (
                                <div className="p-1 bg-blue-100 rounded-full flex-shrink-0">
                                    <Bot className="h-4 w-4 text-blue-600" />
                                </div>
                            )}
                            <div
                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.role === "user"
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-100 text-slate-900"
                                    }`}
                            >
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                <p className="text-xs opacity-70 mt-1">
                                    {message.timestamp.toLocaleTimeString()}
                                </p>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-3 justify-start">
                            <div className="p-1 bg-blue-100 rounded-full flex-shrink-0">
                                <Bot className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="bg-slate-100 px-4 py-2 rounded-lg">
                                <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="border-t border-slate-200 p-4">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask me anything about your bookings..."
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isLoading}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!input.trim() || isLoading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Send className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}