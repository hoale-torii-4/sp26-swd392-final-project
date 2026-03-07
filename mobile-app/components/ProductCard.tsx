import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { AppColors, BorderRadius, Spacing } from '../constants/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.lg * 2 - Spacing.md) / 2;

interface ProductCardProps {
    id: string;
    name: string;
    price: number;
    image: string | null;
    badge?: string;
    badgeColor?: string;
}

function formatPrice(v: number) {
    return v.toLocaleString('vi-VN') + '₫';
}

export default function ProductCard({ id, name, price, image, badge, badgeColor }: ProductCardProps) {
    const router = useRouter();

    return (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => router.push(`/product/${id}` as any)}
        >
            {/* Image */}
            <View style={styles.imageContainer}>
                {image ? (
                    <Image
                        source={{ uri: image }}
                        style={styles.image}
                        contentFit="cover"
                        transition={300}
                    />
                ) : (
                    <View style={styles.placeholder}>
                        <Text style={styles.placeholderText}>🎁</Text>
                    </View>
                )}
                {badge && (
                    <View style={[styles.badge, { backgroundColor: badgeColor || AppColors.primary }]}>
                        <Text style={styles.badgeText}>{badge}</Text>
                    </View>
                )}
            </View>

            {/* Info */}
            <View style={styles.info}>
                <Text style={styles.name} numberOfLines={2}>{name}</Text>
                <Text style={styles.price}>{formatPrice(price)}</Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        width: CARD_WIDTH,
        backgroundColor: AppColors.surface,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        marginBottom: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    imageContainer: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: '#E8E8E4',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 40,
    },
    badge: {
        position: 'absolute',
        top: Spacing.sm,
        left: Spacing.sm,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: 4,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    info: {
        padding: Spacing.md,
    },
    name: {
        fontSize: 13,
        fontWeight: '700',
        color: AppColors.text,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        marginBottom: Spacing.xs,
        minHeight: 34,
    },
    price: {
        fontSize: 16,
        fontWeight: '800',
        color: AppColors.primary,
    },
});
