import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, Spacing, BorderRadius } from '../constants/theme';

interface ConfirmModalProps {
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDestructive?: boolean;
}

export default function ConfirmModal({
    visible,
    title,
    message,
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    onConfirm,
    onCancel,
    isDestructive = false
}: ConfirmModalProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={[styles.modalCard, isDestructive && styles.modalCardDestructive]}>
                    <View style={styles.header}>
                        <View style={[styles.iconWrap, isDestructive && styles.iconWrapDestructive]}>
                            <Ionicons 
                                name={isDestructive ? "warning" : "information-circle"} 
                                size={28} 
                                color={isDestructive ? AppColors.error : AppColors.primary} 
                            />
                        </View>
                    </View>
                    
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>
                    
                    <View style={styles.actions}>
                        <TouchableOpacity 
                            style={[styles.btn, styles.cancelBtn]} 
                            onPress={onCancel}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.cancelText}>{cancelText}</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.btn, isDestructive ? styles.confirmBtnDestructive : styles.confirmBtn]} 
                            onPress={() => {
                                onConfirm();
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.confirmText}>{confirmText}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    modalCard: {
        width: '100%',
        backgroundColor: '#FFF',
        borderRadius: BorderRadius.lg,
        padding: Spacing.xl,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    modalCardDestructive: {
        borderTopWidth: 4,
        borderTopColor: AppColors.error,
    },
    header: {
        marginBottom: Spacing.md,
    },
    iconWrap: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(139, 26, 26, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconWrapDestructive: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: AppColors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        color: AppColors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    actions: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    btn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtn: {
        backgroundColor: AppColors.surface,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    confirmBtn: {
        backgroundColor: AppColors.primary,
    },
    confirmBtnDestructive: {
        backgroundColor: AppColors.error,
    },
    cancelText: {
        color: AppColors.text,
        fontSize: 14,
        fontWeight: '600',
    },
    confirmText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
});
