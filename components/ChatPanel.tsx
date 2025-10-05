import { useState, useEffect } from "react";
import { Send, FileText, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";


interface Citation {
    docName: string;
    page?: number;
    section?: string;
}

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    citations?: Citation[];
    chunks?: string[];
}

interface ChatPanelProps {
    selectedFileId?: string | null;
    selectedFileName?: string | null;
}

export function ChatPanel({ selectedFileId, selectedFileName }: ChatPanelProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [showChunks, setShowChunks] = useState<Record<string, boolean>>({});
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Reset messages when selected file changes
        setMessages([]);
    }, [selectedFileId]);

    const handleSend = async () => {
        if (!input.trim() || !selectedFileId) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input,
        };

        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: input,
                    fileId: selectedFileId,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to get response');
            }

            const data = await response.json();

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: data.content,
                citations: data.citations,
                chunks: data.chunks,
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "Sorry, I encountered an error while processing your message. Please try again.",
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleChunks = (messageId: string) => {
        setShowChunks(prev => ({ ...prev, [messageId]: !prev[messageId] }));
    };

    return (
        <div className="h-full flex flex-col border-l border-border bg-background">
            <div className="p-4 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">Ask Questions</h2>
                {selectedFileName ? (
                    <p className="text-sm text-muted-foreground mt-1">Selected File: {selectedFileName}</p>
                ) : (
                    <p className="text-sm text-muted-foreground mt-1">Chat about documents in this folder</p>
                )}
            </div>

            <ScrollArea className="flex-1 p-4">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <FileText className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2 text-foreground">Start a conversation</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                            Ask questions about the documents in this folder. I'll answer based only on the
                            uploaded content.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((message) => (
                            <div key={message.id} className="space-y-2">
                                <div
                                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"
                                        }`}
                                >
                                    <Card
                                        className={`p-3 max-w-[85%] ${message.role === "user"
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-card"
                                            }`}
                                    >
                                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                    </Card>
                                </div>

                                {message.citations && message.citations.length > 0 && (
                                    <div className="ml-2 space-y-2">
                                        <div className="flex flex-wrap gap-2">
                                            {message.citations.map((citation, idx) => (
                                                <Badge
                                                    key={idx}
                                                    variant="secondary"
                                                    className="text-xs cursor-pointer hover:bg-secondary/80"
                                                >
                                                    <FileText className="h-3 w-3 mr-1" />
                                                    {citation.docName}
                                                    {citation.page && ` • p.${citation.page}`}
                                                    {citation.section && ` • ${citation.section}`}
                                                </Badge>
                                            ))}
                                        </div>

                                        {message.chunks && message.chunks.length > 0 && (
                                            <div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => toggleChunks(message.id)}
                                                    className="h-7 text-xs"
                                                >
                                                    {showChunks[message.id] ? (
                                                        <ChevronDown className="h-3 w-3 mr-1" />
                                                    ) : (
                                                        <ChevronRight className="h-3 w-3 mr-1" />
                                                    )}
                                                    {showChunks[message.id] ? "Hide" : "View"} retrieved chunks (
                                                    {message.chunks.length})
                                                </Button>

                                                {showChunks[message.id] && (
                                                    <div className="mt-2 space-y-2">
                                                        {message.chunks.map((chunk, idx) => (
                                                            <Card key={idx} className="p-3 bg-muted/50">
                                                                <p className="text-xs text-muted-foreground">{chunk}</p>
                                                            </Card>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start">
                                <Card className="p-3 max-w-[85%] bg-card">
                                    <div className="flex items-center space-x-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                        <p className="text-sm text-muted-foreground">Thinking...</p>
                                    </div>
                                </Card>
                            </div>
                        )}
                    </div>
                )}
            </ScrollArea>

            <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                    <Input
                        placeholder="Ask a question about the documents..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSend()}
                        disabled={isLoading || !selectedFileId}
                    />
                    <Button onClick={handleSend} size="icon" disabled={isLoading || !selectedFileId}>
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}