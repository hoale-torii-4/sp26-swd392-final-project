import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { AppColors } from '../constants/theme';

interface LoadingSpinnerProps {
    message?: string;
    size?: 'small' | 'large';
    fullScreen?: boolean;
}

export default function LoadingSpinner({ size = 'large', fullScreen = true }: LoadingSpinnerProps) {
    if (fullScreen) {
        return (
            <View style={styles.fullScreen}>
                <ActivityIndicator size={size} color={AppColors.primary} />
            </View>
        );
    }

    return <ActivityIndicator size={size} color={AppColors.primary} />;
}

const styles = StyleSheet.create({
    fullScreen: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: AppColors.background,
    },
});
