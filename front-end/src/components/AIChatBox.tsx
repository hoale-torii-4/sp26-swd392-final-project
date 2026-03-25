import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { chatService, type ChatMessagePayload } from "../services/chatService";
import { authService } from "../services/authService";
import { FiMessageSquare, FiChevronDown, FiSend } from "react-icons/fi";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

const WELCOME_MSG: Message = {
    id: "welcome",
    role: "assistant",
    content: "Xin chào! 👋 Tôi là trợ lý AI của Lộc Xuân. Tôi có thể giúp bạn tìm quà Tết, tư vấn sản phẩm, hoặc giải đáp thắc mắc. Hãy hỏi tôi bất cứ điều gì!",
    timestamp: new Date(),
};

export default function AIChatBox() {
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // ── Drag state ──
    const [position, setPosition] = useState({ x: 0, y: 0 }); // offset from default bottom-right
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0, moved: false });

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping]);

    // Focus input when chat opens
    useEffect(() => {
        if (isOpen) inputRef.current?.focus();
    }, [isOpen]);

    // ── Drag handlers ──
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        // Only start drag on left click
        if (e.button !== 0) return;
        setIsDragging(true);
        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startPosX: position.x,
            startPosY: position.y,
            moved: false,
        };
        e.preventDefault();
    }, [position]);

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const dx = e.clientX - dragRef.current.startX;
            const dy = e.clientY - dragRef.current.startY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                dragRef.current.moved = true;
            }
            setPosition({
                x: dragRef.current.startPosX + dx,
                y: dragRef.current.startPosY + dy,
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging]);

    const handleToggle = () => {
        // Don't toggle if user was dragging
        if (dragRef.current.moved) {
            dragRef.current.moved = false;
            return;
        }
        setIsOpen(!isOpen);
    };

    const handleSend = async () => {
        const text = input.trim();
        if (!text || isTyping) return;

        const user = authService.getUser();
        const senderId = user?.Id ?? "guest";

        const userMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content: text,
            timestamp: new Date(),
        };

        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        setInput("");
        setIsTyping(true);

        try {
            // Build payload: only user messages (exclude welcome & bot messages)
            const payload: ChatMessagePayload[] = updatedMessages
                .filter((m) => m.role === "user")
                .map((m) => ({
                    id: m.id,
                    sender: senderId,
                    message: m.content,
                    createdAt: m.timestamp.toISOString(),
                }));

            const data = await chatService.sendMessage(payload);
            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: data.response,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, botMsg]);
        } catch {
            const errMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "Xin lỗi, tôi gặp lỗi khi xử lý. Vui lòng thử lại! 🙏",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatTime = (d: Date) =>
        d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

    // Button position: offset from default bottom-6 right-6 (24px)
    const btnStyle: React.CSSProperties = {
        right: 24 - position.x,
        bottom: 24 - position.y,
    };

    // Chat window position: offset from default bottom-24 (96px) right-6 (24px)
    const chatStyle: React.CSSProperties = {
        right: 24 - position.x,
        bottom: 96 - position.y,
    };

    // Hover state for extra interactions
    const [isHovered, setIsHovered] = useState(false);

    // Hide chatbox on admin pages
    if (location.pathname.startsWith("/admin")) {
        return null;
    }

    return (
        <>
            {/* ═══ Keyframe animations for the character ═══ */}
            <style>{`
                @keyframes chatbot-float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-3px); }
                }
                @keyframes chatbot-blink {
                    0%, 42%, 44%, 100% { transform: scaleY(1); }
                    43% { transform: scaleY(0.1); }
                }
                @keyframes chatbot-wave {
                    0%, 60%, 100% { transform: rotate(0deg); }
                    10% { transform: rotate(14deg); }
                    20% { transform: rotate(-8deg); }
                    30% { transform: rotate(14deg); }
                    40% { transform: rotate(-4deg); }
                    50% { transform: rotate(10deg); }
                }
                @keyframes chatbot-glow {
                    0%, 100% { box-shadow: 0 4px 15px rgba(139,26,26,0.3); }
                    50% { box-shadow: 0 4px 25px rgba(139,26,26,0.5); }
                }
                @keyframes chatbot-hover-jump {
                    0%, 100% { transform: translateY(0) scale(1); }
                    30% { transform: translateY(-6px) scale(1.05); }
                    50% { transform: translateY(-2px) scale(1.02); }
                    70% { transform: translateY(-4px) scale(1.03); }
                }
                @keyframes chatbot-heart {
                    0%, 100% { transform: scale(0); opacity: 0; }
                    20% { transform: scale(1.2); opacity: 1; }
                    50% { transform: scale(1); opacity: 1; }
                    80% { transform: scale(0.8) translateY(-8px); opacity: 0.5; }
                }
                @keyframes chatbot-thinking-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes chatbot-thinking-dot {
                    0%, 80%, 100% { transform: scale(0); opacity: 0; }
                    40% { transform: scale(1); opacity: 1; }
                }
                @keyframes chatbot-zzz {
                    0% { transform: translateY(0) scale(0.6); opacity: 0; }
                    20% { opacity: 1; }
                    100% { transform: translateY(-14px) scale(1); opacity: 0; }
                }
                @keyframes chatbot-sleep-breathe {
                    0%, 100% { transform: scaleY(1); }
                    50% { transform: scaleY(1.03); }
                }
            `}</style>

            {/* ════════ FLOATING BUTTON ════════ */}
            <button
                onMouseDown={handleMouseDown}
                onClick={handleToggle}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={btnStyle}
                className={`fixed z-50 w-16 h-16 rounded-full flex items-center justify-center cursor-pointer group select-none overflow-visible ${isOpen
                        ? "bg-gradient-to-br from-[#4a5568] to-[#2d3748] shadow-lg"
                        : "bg-gradient-to-br from-[#8B1A1A] to-[#C0392B]"
                    } ${isDragging ? "shadow-2xl !cursor-grabbing" : ""}`}
                title="Trợ lý AI — kéo để di chuyển"
            >
                {isOpen ? (
                    /* ═══ SLEEPY / CLOSE STATE ═══ */
                    <div style={{ animation: 'chatbot-sleep-breathe 3s ease-in-out infinite' }} className="relative">
                        <svg width="44" height="44" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Antenna - dimmed */}
                            <line x1="50" y1="18" x2="50" y2="8" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
                            <circle cx="50" cy="6" r="3.5" fill="#94a3b8" opacity="0.5" />

                            {/* Head / Body */}
                            <circle cx="50" cy="48" r="30" fill="url(#botGradSleep)" />

                            {/* Face background */}
                            <ellipse cx="50" cy="50" rx="22" ry="18" fill="white" opacity="0.85" />

                            {/* Closed eyes - curved lines */}
                            <path d="M32 46 Q38 50 44 46" stroke="#1a1a2e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                            <path d="M56 46 Q62 50 68 46" stroke="#1a1a2e" strokeWidth="2.5" fill="none" strokeLinecap="round" />

                            {/* Blush cheeks */}
                            <circle cx="32" cy="54" r="4" fill="#FF8A8A" opacity="0.4" />
                            <circle cx="68" cy="54" r="4" fill="#FF8A8A" opacity="0.4" />

                            {/* Small sleepy mouth */}
                            <ellipse cx="50" cy="58" rx="4" ry="2.5" fill="#1a1a2e" opacity="0.6" />

                            {/* Zzz floating */}
                            <text x="68" y="30" fill="#FFD93D" fontSize="10" fontWeight="bold" style={{ animation: 'chatbot-zzz 2s ease-out infinite' }}>z</text>
                            <text x="74" y="22" fill="#FFD93D" fontSize="13" fontWeight="bold" style={{ animation: 'chatbot-zzz 2s ease-out infinite 0.5s' }}>z</text>
                            <text x="80" y="12" fill="#FFD93D" fontSize="16" fontWeight="bold" style={{ animation: 'chatbot-zzz 2s ease-out infinite 1s' }}>Z</text>

                            {/* Feet */}
                            <ellipse cx="40" cy="80" rx="10" ry="5" fill="white" opacity="0.6" />
                            <ellipse cx="60" cy="80" rx="10" ry="5" fill="white" opacity="0.6" />

                            <defs>
                                <radialGradient id="botGradSleep" cx="0.4" cy="0.3" r="0.7">
                                    <stop offset="0%" stopColor="#E2E8F0" />
                                    <stop offset="100%" stopColor="#CBD5E1" />
                                </radialGradient>
                            </defs>
                        </svg>
                    </div>
                ) : isTyping ? (
                    /* ═══ THINKING / TYPING STATE ═══ */
                    <div style={{ animation: 'chatbot-float 2s ease-in-out infinite' }} className="relative">
                        <svg width="44" height="44" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Antenna - spinning */}
                            <line x1="50" y1="18" x2="50" y2="8" stroke="#FFD93D" strokeWidth="3" strokeLinecap="round" />
                            <g style={{ animation: 'chatbot-thinking-spin 1s linear infinite', transformOrigin: '50px 6px' }}>
                                <circle cx="50" cy="6" r="5" fill="none" stroke="#FFD93D" strokeWidth="2" strokeDasharray="4 3" />
                            </g>

                            {/* Head / Body */}
                            <circle cx="50" cy="48" r="30" fill="url(#botGradThink)" />

                            {/* Face background */}
                            <ellipse cx="50" cy="50" rx="22" ry="18" fill="white" opacity="0.9" />

                            {/* Looking-up eyes */}
                            <circle cx="38" cy="44" r="5" fill="#1a1a2e" />
                            <circle cx="37" cy="42" r="1.8" fill="white" />
                            <circle cx="62" cy="44" r="5" fill="#1a1a2e" />
                            <circle cx="61" cy="42" r="1.8" fill="white" />

                            {/* Thinking mouth — small 'o' */}
                            <ellipse cx="50" cy="58" rx="3.5" ry="3" fill="#1a1a2e" opacity="0.7" />

                            {/* Thinking dots */}
                            <circle cx="74" cy="32" r="3" fill="#FFD93D" style={{ animation: 'chatbot-thinking-dot 1.5s ease-in-out infinite' }} />
                            <circle cx="80" cy="24" r="4" fill="#FFD93D" style={{ animation: 'chatbot-thinking-dot 1.5s ease-in-out infinite 0.3s' }} />
                            <circle cx="88" cy="14" r="5" fill="#FFD93D" style={{ animation: 'chatbot-thinking-dot 1.5s ease-in-out infinite 0.6s' }} />

                            {/* Blush cheeks */}
                            <circle cx="32" cy="55" r="4" fill="#FF8A8A" opacity="0.5" />
                            <circle cx="68" cy="55" r="4" fill="#FF8A8A" opacity="0.5" />

                            {/* Feet */}
                            <ellipse cx="40" cy="80" rx="10" ry="5" fill="white" opacity="0.8" />
                            <ellipse cx="60" cy="80" rx="10" ry="5" fill="white" opacity="0.8" />

                            <defs>
                                <radialGradient id="botGradThink" cx="0.4" cy="0.3" r="0.7">
                                    <stop offset="0%" stopColor="#FFFBEB" />
                                    <stop offset="100%" stopColor="#FDE68A" />
                                </radialGradient>
                            </defs>
                        </svg>
                    </div>
                ) : (
                    /* ═══ IDLE STATE (with hover interaction) ═══ */
                    <div
                        style={{ animation: isHovered ? 'chatbot-hover-jump 0.6s ease-out' : 'chatbot-float 2.5s ease-in-out infinite, chatbot-glow 3s ease-in-out infinite' }}
                        className="relative"
                    >
                        <svg width="44" height="44" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Antenna */}
                            <line x1="50" y1="18" x2="50" y2="8" stroke="#FFD93D" strokeWidth="3" strokeLinecap="round" />
                            <circle cx="50" cy="6" r="4" fill="#FFD93D">
                                <animate attributeName="r" values="4;5;4" dur="1.5s" repeatCount="indefinite" />
                                <animate attributeName="opacity" values="1;0.6;1" dur="1.5s" repeatCount="indefinite" />
                            </circle>

                            {/* Head / Body */}
                            <circle cx="50" cy="48" r="30" fill="white" />
                            <circle cx="50" cy="48" r="30" fill="url(#botGrad)" />

                            {/* Face background */}
                            <ellipse cx="50" cy="50" rx="22" ry="18" fill="white" opacity="0.9" />

                            {/* Eyes — heart eyes on hover, normal blink otherwise */}
                            {isHovered ? (
                                <>
                                    {/* Heart eyes */}
                                    <g style={{ animation: 'chatbot-heart 0.6s ease-out forwards', transformOrigin: '38px 46px' }}>
                                        <path d="M33 44 C33 41, 36 39, 38 42 C40 39, 43 41, 43 44 C43 47, 38 50, 38 50 C38 50, 33 47, 33 44Z" fill="#E11D48" />
                                    </g>
                                    <g style={{ animation: 'chatbot-heart 0.6s ease-out 0.1s forwards', transformOrigin: '62px 46px' }}>
                                        <path d="M57 44 C57 41, 60 39, 62 42 C64 39, 67 41, 67 44 C67 47, 62 50, 62 50 C62 50, 57 47, 57 44Z" fill="#E11D48" />
                                    </g>
                                </>
                            ) : (
                                <>
                                    <g style={{ animation: 'chatbot-blink 4s ease-in-out infinite', transformOrigin: '38px 46px' }}>
                                        <circle cx="38" cy="46" r="5" fill="#1a1a2e" />
                                        <circle cx="36" cy="44" r="1.8" fill="white" />
                                    </g>
                                    <g style={{ animation: 'chatbot-blink 4s ease-in-out infinite 0.1s', transformOrigin: '62px 46px' }}>
                                        <circle cx="62" cy="46" r="5" fill="#1a1a2e" />
                                        <circle cx="60" cy="44" r="1.8" fill="white" />
                                    </g>
                                </>
                            )}

                            {/* Blush cheeks — bigger on hover */}
                            <circle cx="32" cy="55" r={isHovered ? "5.5" : "4"} fill="#FF8A8A" opacity={isHovered ? "0.7" : "0.5"} style={{ transition: 'all 0.3s' }} />
                            <circle cx="68" cy="55" r={isHovered ? "5.5" : "4"} fill="#FF8A8A" opacity={isHovered ? "0.7" : "0.5"} style={{ transition: 'all 0.3s' }} />

                            {/* Smile — bigger smile on hover */}
                            {isHovered ? (
                                <path d="M40 55 Q50 67 60 55" stroke="#1a1a2e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                            ) : (
                                <path d="M42 56 Q50 64 58 56" stroke="#1a1a2e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                            )}

                            {/* Waving hand — faster wave on hover */}
                            <g style={{ animation: `chatbot-wave ${isHovered ? '0.8s' : '3s'} ease-in-out infinite`, transformOrigin: '78px 62px' }}>
                                <circle cx="82" cy="58" r="7" fill="#FFD93D" />
                                <ellipse cx="86" cy="52" rx="2.5" ry="4" fill="#FFD93D" transform="rotate(-15 86 52)" />
                                <ellipse cx="89" cy="55" rx="2.5" ry="3.5" fill="#FFD93D" transform="rotate(-5 89 55)" />
                                <ellipse cx="90" cy="59" rx="2.3" ry="3" fill="#FFD93D" />
                            </g>

                            {/* Feet */}
                            <ellipse cx="40" cy="80" rx="10" ry="5" fill="white" opacity="0.8" />
                            <ellipse cx="60" cy="80" rx="10" ry="5" fill="white" opacity="0.8" />

                            {/* Gradient definition */}
                            <defs>
                                <radialGradient id="botGrad" cx="0.4" cy="0.3" r="0.7">
                                    <stop offset="0%" stopColor="#FFF5F5" />
                                    <stop offset="100%" stopColor="#FECDD3" />
                                </radialGradient>
                            </defs>
                        </svg>
                    </div>
                )}
            </button>

            {/* ════════ CHAT WINDOW ════════ */}
            <div
                style={chatStyle}
                className={`fixed z-50 w-[380px] max-h-[520px] bg-white rounded-2xl shadow-2xl shadow-black/15 flex flex-col overflow-hidden origin-bottom-right ${isDragging ? "" : "transition-all duration-300"} ${isOpen ? "scale-100 opacity-100 pointer-events-auto" : "scale-75 opacity-0 pointer-events-none"
                    }`}
            >
                {/* ──── Header (draggable) ──── */}
                <div
                    className={`bg-gradient-to-r from-[#8B1A1A] to-[#B22222] px-5 py-4 flex items-center gap-3 ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
                    onMouseDown={handleMouseDown}
                >
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <FiMessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-white font-bold text-sm">Trợ lý Lộc Xuân</h3>
                        <p className="text-white/70 text-xs flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />
                            Đang hoạt động
                        </p>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-white/70 hover:text-white transition-colors cursor-pointer"
                    >
                        <FiChevronDown className="w-5 h-5" />
                    </button>
                </div>

                {/* ──── Messages ──── */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50/50" style={{ maxHeight: "340px" }}>
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[80%] ${msg.role === "user" ? "order-1" : "order-1"}`}>
                                {msg.role === "assistant" && (
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <div className="w-5 h-5 bg-[#8B1A1A] rounded-full flex items-center justify-center">
                                            <FiMessageSquare className="w-3 h-3 text-white" />
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-medium">Trợ lý AI</span>
                                    </div>
                                )}
                                <div
                                    className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user"
                                            ? "bg-[#8B1A1A] text-white rounded-br-md"
                                            : "bg-white text-gray-800 rounded-bl-md shadow-sm border border-gray-100"
                                        }`}
                                >
                                    {msg.content}
                                </div>
                                <p className={`text-[10px] text-gray-400 mt-1 ${msg.role === "user" ? "text-right" : "text-left"}`}>
                                    {formatTime(msg.timestamp)}
                                </p>
                            </div>
                        </div>
                    ))}

                    {/* Typing indicator */}
                    {isTyping && (
                        <div className="flex justify-start">
                            <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <div className="w-5 h-5 bg-[#8B1A1A] rounded-full flex items-center justify-center">
                                        <FiMessageSquare className="w-3 h-3 text-white" />
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-medium">Đang trả lời...</span>
                                </div>
                                <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md shadow-sm border border-gray-100 flex items-center gap-1">
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* ──── Input ──── */}
                <div className="px-4 py-3 bg-white border-t border-gray-100">
                    <div className="flex items-center gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Nhập tin nhắn..."
                            disabled={isTyping}
                            className="flex-1 px-4 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:bg-white focus:ring-2 focus:ring-[#8B1A1A]/20 border border-gray-200 focus:border-[#8B1A1A]/30 transition-all disabled:opacity-50"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isTyping}
                            className="w-10 h-10 bg-[#8B1A1A] rounded-xl flex items-center justify-center text-white hover:bg-[#701515] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                        >
                            <FiSend className="w-4.5 h-4.5" />
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-400 text-center mt-2">
                        Trợ lý AI · Hỗ trợ bởi Lộc Xuân
                    </p>
                </div>
            </div>
        </>
    );
}
