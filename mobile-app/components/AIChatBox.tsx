import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    FlatList, Animated, PanResponder, KeyboardAvoidingView,
    Platform, Modal, Dimensions, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Svg, { Line, Circle, Ellipse, G, Path, Defs, RadialGradient, Stop } from 'react-native-svg';
import { usePathname, useRouter } from 'expo-router';
import { chatService, type ChatMessagePayload, type ChatProduct } from '../services/chatService';
import { useAuth } from '../contexts/AuthContext';
import { AppColors, BorderRadius, Spacing } from '../constants/theme';

const { width, height } = Dimensions.get('window');
const BUTTON_SIZE = 60;
const INITIAL_RIGHT = 20;
const INITIAL_BOTTOM = 90;

// Typing dot animation component
const AnimatedDot = ({ delay }: { delay: number }) => {
    const scale = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const bounce = Animated.sequence([
            Animated.timing(scale, { toValue: 1, duration: 250, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]);
        setTimeout(() => {
            Animated.loop(bounce).start();
        }, delay);
    }, [scale, delay]);

    return (
        <Animated.View style={[
            { width: 6, height: 6, borderRadius: 3, backgroundColor: '#9CA3AF', marginHorizontal: 2 },
            { transform: [{ scale }] }
        ]} />
    );
};

// SVG Robot icon translated from Web FE
const BotIcon = () => (
    <Svg width="44" height="44" viewBox="0 0 100 100" fill="none">
        {/* Antenna */}
        <Line x1="50" y1="18" x2="50" y2="8" stroke="#FFD93D" strokeWidth="3" strokeLinecap="round" />
        <Circle cx="50" cy="6" r="4" fill="#FFD93D" />

        {/* Head / Body */}
        <Circle cx="50" cy="48" r="30" fill="white" />
        <Circle cx="50" cy="48" r="30" fill="url(#botGrad)" />

        {/* Face background */}
        <Ellipse cx="50" cy="50" rx="22" ry="18" fill="white" opacity="0.9" />

        {/* Eyes */}
        <G>
            <Circle cx="38" cy="46" r="5" fill="#1a1a2e" />
            <Circle cx="36" cy="44" r="1.8" fill="white" />
        </G>
        <G>
            <Circle cx="62" cy="46" r="5" fill="#1a1a2e" />
            <Circle cx="60" cy="44" r="1.8" fill="white" />
        </G>

        {/* Blush cheeks */}
        <Circle cx="32" cy="55" r="4" fill="#FF8A8A" opacity="0.5" />
        <Circle cx="68" cy="55" r="4" fill="#FF8A8A" opacity="0.5" />

        {/* Smile */}
        <Path d="M42 56 Q50 64 58 56" stroke="#1a1a2e" strokeWidth="2.5" fill="none" strokeLinecap="round" />

        {/* Waving hand */}
        <G>
            <Circle cx="82" cy="58" r="7" fill="#FFD93D" />
            <Ellipse cx="86" cy="52" rx="2.5" ry="4" fill="#FFD93D" rotation="-15" origin="86, 52" />
            <Ellipse cx="89" cy="55" rx="2.5" ry="3.5" fill="#FFD93D" rotation="-5" origin="89, 55" />
            <Ellipse cx="90" cy="59" rx="2.3" ry="3" fill="#FFD93D" />
        </G>

        {/* Feet */}
        <Ellipse cx="40" cy="80" rx="10" ry="5" fill="white" opacity="0.8" />
        <Ellipse cx="60" cy="80" rx="10" ry="5" fill="white" opacity="0.8" />

        <Defs>
            <RadialGradient id="botGrad" cx="40%" cy="30%" rx="70%" ry="70%">
                <Stop offset="0%" stopColor="#FFF5F5" />
                <Stop offset="100%" stopColor="#FECDD3" />
            </RadialGradient>
        </Defs>
    </Svg>
);

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    products?: ChatProduct[];
}

function MarkdownText({ content, style }: { content: string; style: any }) {
    const renderInline = (line: string, lineKey: string) => {
        const tokens = line.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
        return tokens.map((token, index) => {
            if (token.startsWith('**') && token.endsWith('**')) {
                return <Text key={`${lineKey}-${index}`} style={{ fontWeight: '700' }}>{token.slice(2, -2)}</Text>;
            }
            if (token.startsWith('*') && token.endsWith('*')) {
                return <Text key={`${lineKey}-${index}`} style={{ fontStyle: 'italic' }}>{token.slice(1, -1)}</Text>;
            }
            if (token.startsWith('`') && token.endsWith('`')) {
                return <Text key={`${lineKey}-${index}`} style={{ color: '#8B1A1A', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>{token.slice(1, -1)}</Text>;
            }
            return token;
        });
    };

    return (
        <View>
            {content.split(/\r?\n/).map((line, index) => {
                if (!line.trim()) return <View key={`blank-${index}`} style={{ height: 5 }} />;
                const heading = line.match(/^#{1,3}\s+(.+)$/);
                const bullet = line.match(/^\s*[-*]\s+(.+)$/);
                const text = heading?.[1] || bullet?.[1] || line;
                return (
                    <Text key={`line-${index}`} style={[style, heading && { fontWeight: '700', color: '#8B1A1A' }, { marginBottom: 2 }]}>
                        {bullet ? '•  ' : ''}{renderInline(text, `line-${index}`)}
                    </Text>
                );
            })}
        </View>
    );
}

function ProductSuggestions({ products, onPress }: { products: ChatProduct[]; onPress: (product: ChatProduct) => void }) {
    if (!products.length) return null;
    return (
        <View style={styles.productSuggestions}>
            {products.map((product) => (
                <TouchableOpacity key={`${product.type}-${product.id}`} style={styles.productCard} onPress={() => onPress(product)} activeOpacity={0.75}>
                    {product.image ? <Image source={{ uri: product.image }} style={styles.productImage} contentFit="cover" /> : <View style={[styles.productImage, styles.productImagePlaceholder]} />}
                    <View style={styles.productInfo}>
                        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                        <Text style={styles.productPrice}>{product.price.toLocaleString('vi-VN')}₫</Text>
                        <Text style={styles.productLink}>Xem chi tiết ›</Text>
                    </View>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const WELCOME_MSG: Message = {
    id: 'welcome',
    role: 'assistant',
    content: 'Xin chào! 👋 Tôi là trợ lý AI của Lộc Xuân. Tôi có thể giúp bạn tìm quà Tết, tư vấn sản phẩm, hoặc giải đáp thắc mắc. Hãy hỏi tôi bất cứ điều gì!',
    timestamp: new Date(),
};

export default function AIChatBox() {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuth();

    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    const flatListRef = useRef<FlatList>(null);
    const inputRef = useRef<TextInput>(null);

    // Draggable position
    const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
    const hasMoved = useRef(false);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gesture) => {
                const { dx, dy } = gesture;
                return Math.abs(dx) > 3 || Math.abs(dy) > 3;
            },
            onPanResponderGrant: () => {
                pan.setOffset({
                    x: (pan.x as any)._value,
                    y: (pan.y as any)._value,
                });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: () => {
                pan.flattenOffset();
            },
            onPanResponderTerminate: () => {
                pan.flattenOffset();
            }
        })
    ).current;

    const [isHovered, setIsHovered] = useState(false); // Mobile doesn't really hover, but we can set it on pressIn if needed


    const handlePressButton = () => {
        setIsOpen(true);
    };

    const handleSend = async () => {
        const text = input.trim();
        if (!text || isTyping) return;

        const senderId = user?.Id || 'guest';
        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            timestamp: new Date(),
        };

        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        setInput('');
        setIsTyping(true);

        // Scroll to bottom
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        try {
            // Build payload for API
            const payload: ChatMessagePayload[] = updatedMessages
                .filter(m => m.role === 'user')
                .map(m => ({
                    id: m.id,
                    sender: senderId,
                    message: m.content,
                    createdAt: m.timestamp.toISOString(),
                }));

            const data = await chatService.sendMessage(payload);

            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response,
                timestamp: new Date(),
                products: data.products ?? [],
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            const errMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Xin lỗi, tôi gặp lỗi khi xử lý. Vui lòng thử lại! 🙏',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errMsg]);
        } finally {
            setIsTyping(false);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    };

    const formatTime = (d: Date) => {
        return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    // Hide chatbox on admin tabs
    if (pathname.includes('/(admin-tabs)') || pathname.includes('/admin')) {
        return null;
    }

    return (
        <>
            {/* Floating Draggable Button */}
            {!isOpen && (
                <Animated.View
                    style={[
                        styles.fabContainer,
                        {
                            transform: [{ translateX: pan.x }, { translateY: pan.y }],
                        },
                    ]}
                    {...panResponder.panHandlers}
                >
                    <TouchableOpacity
                        style={styles.fab}
                        activeOpacity={0.9}
                        onPress={handlePressButton}
                        onPressIn={() => setIsHovered(true)}
                        onPressOut={() => setIsHovered(false)}
                    >
                        {/* ═══ IDLE / HOVER STATE (Simplified SVG for mobile) ═══ */}
                        <View style={{ transform: [{ scale: isHovered ? 1.05 : 1 }] }}>
                            <BotIcon />
                        </View>
                    </TouchableOpacity>
                </Animated.View>
            )}

            {/* Chat Window Modal */}
            <Modal
                visible={isOpen}
                animationType="slide"
                transparent
                onRequestClose={() => setIsOpen(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View style={styles.chatContainer}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.headerTitleRow}>
                                <View style={styles.avatarWrap}>
                                    <View style={{ transform: [{ scale: 0.7 }] }}>
                                        <BotIcon />
                                    </View>
                                </View>
                                <View>
                                    <Text style={styles.headerTitle}>Trợ lý Lộc Xuân</Text>
                                    <Text style={styles.headerStatus}>
                                        <View style={[styles.statusDot, { position: 'relative', top: 0, right: 0, width: 6, height: 6, marginRight: 4 }]} />
                                        Đang hoạt động
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeBtn}>
                                <Ionicons name="chevron-down" size={24} color="rgba(255,255,255,0.7)" />
                            </TouchableOpacity>
                        </View>

                        {/* Messages List */}
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            keyExtractor={(m) => m.id}
                            contentContainerStyle={styles.messageList}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => {
                                const isUser = item.role === 'user';
                                return (
                                    <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowBot]}>
                                        <View style={[styles.messageBubble, isUser ? styles.messageBubbleUser : styles.messageBubbleBot]}>
                                            {isUser ? <Text style={styles.messageTextUser}>{item.content}</Text> : <MarkdownText content={item.content} style={styles.messageTextBot} />}
                                        </View>
                                        {!isUser && <ProductSuggestions products={item.products ?? []} onPress={(product) => router.push({ pathname: '/product/[id]', params: { id: product.id, ...(product.type === 'item' ? { type: 'item' } : {}) } })} />}
                                        <Text style={[styles.timestamp, isUser ? styles.timestampUser : styles.timestampBot]}>
                                            {formatTime(item.timestamp)}
                                        </Text>
                                    </View>
                                );
                            }}
                            ListFooterComponent={
                                isTyping ? (
                                    <View style={[styles.messageRow, styles.messageRowBot]}>
                                        <View style={[styles.messageBubble, styles.messageBubbleBot, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 4 }}>
                                                <AnimatedDot delay={0} />
                                                <AnimatedDot delay={150} />
                                                <AnimatedDot delay={300} />
                                            </View>
                                            <Text style={styles.messageTextBot}>Bối rối, đợi em xíu...</Text>
                                        </View>
                                    </View>
                                ) : null
                            }
                        />

                        {/* Input Area */}
                        <View style={styles.inputContainer}>
                            <TextInput
                                ref={inputRef}
                                style={styles.input}
                                placeholder="Nhập tin nhắn..."
                                value={input}
                                onChangeText={setInput}
                                onSubmitEditing={handleSend}
                                returnKeyType="send"
                                editable={!isTyping}
                            />
                            <TouchableOpacity
                                style={[styles.sendBtn, (!input.trim() || isTyping) && styles.sendBtnDisabled]}
                                onPress={handleSend}
                                disabled={!input.trim() || isTyping}
                            >
                                <Ionicons name="send" size={18} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    fabContainer: {
        position: 'absolute',
        bottom: INITIAL_BOTTOM,
        right: INITIAL_RIGHT,
        zIndex: 9999,
        elevation: 10,
    },
    fab: {
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        borderRadius: BUTTON_SIZE / 2,
        backgroundColor: '#8B1A1A',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#8B1A1A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#4ADE80',
        position: 'absolute',
        top: 4,
        right: 4,
        borderWidth: 2,
        borderColor: '#FFF',
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    chatContainer: {
        height: height * 0.7,
        backgroundColor: '#F9FAFB',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
    },
    header: {
        backgroundColor: '#8B1A1A',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: 14,
    },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatarWrap: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#FFF',
        justifyContent: 'center', alignItems: 'center',
        overflow: 'hidden',
    },
    headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFF' },
    headerStatus: { fontSize: 11, color: 'rgba(255,255,255,0.8)', flexDirection: 'row', alignItems: 'center' },
    closeBtn: { padding: 4 },

    messageList: {
        padding: Spacing.md,
        paddingBottom: 20,
    },
    messageRow: {
        marginBottom: 16,
        maxWidth: '85%',
    },
    messageRowUser: { alignSelf: 'flex-end' },
    messageRowBot: { alignSelf: 'flex-start' },

    messageBubble: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
    },
    messageBubbleUser: {
        backgroundColor: '#8B1A1A',
        borderBottomRightRadius: 4,
    },
    messageBubbleBot: {
        backgroundColor: '#FFF',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: AppColors.borderLight,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
    },
    messageTextUser: {
        fontSize: 14, color: '#FFF', lineHeight: 22,
    },
    messageTextBot: {
        fontSize: 14, color: AppColors.text, lineHeight: 22,
    },
    productSuggestions: {
        marginTop: 8,
        gap: 8,
    },
    productCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EAD9D9',
        backgroundColor: '#FFFAFA',
    },
    productImage: {
        width: 52,
        height: 52,
        borderRadius: 9,
        backgroundColor: '#F4E7E7',
    },
    productImagePlaceholder: {
        backgroundColor: '#F4E7E7',
    },
    productInfo: {
        flex: 1,
        marginLeft: 9,
    },
    productName: {
        color: AppColors.text,
        fontSize: 12,
        fontWeight: '600',
    },
    productPrice: {
        color: '#8B1A1A',
        fontSize: 12,
        fontWeight: '700',
        marginTop: 3,
    },
    productLink: {
        color: AppColors.textMuted,
        fontSize: 10,
        marginTop: 2,
    },
    timestamp: {
        fontSize: 10, color: AppColors.textMuted, marginTop: 4,
    },
    timestampUser: { textAlign: 'right' },
    timestampBot: { textAlign: 'left', marginLeft: 4 },

    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: AppColors.borderLight,
        paddingBottom: Platform.OS === 'ios' ? 34 : 10, // Safe area for iOS
    },
    input: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 14,
        color: AppColors.text,
        maxHeight: 100,
    },
    sendBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#8B1A1A',
        justifyContent: 'center', alignItems: 'center',
        marginLeft: 10,
    },
    sendBtnDisabled: {
        opacity: 0.5,
    },
});
