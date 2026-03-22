import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../contexts/AuthContext';
import { AppColors } from '../constants/theme';
import Toast, { BaseToast, ErrorToast, ToastConfig } from 'react-native-toast-message';

// Global Toast Config
const toastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: AppColors.primary, backgroundColor: '#FAFAF8' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: 'bold',
        color: AppColors.primary
      }}
      text2Style={{
        fontSize: 13,
        color: AppColors.text
      }}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: AppColors.error, backgroundColor: '#FAFAF8' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: 'bold',
        color: AppColors.error
      }}
      text2Style={{
        fontSize: 13,
        color: AppColors.text
      }}
    />
  ),
  info: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: AppColors.accent, backgroundColor: '#FAFAF8' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: 'bold',
        color: AppColors.dark
      }}
      text2Style={{
        fontSize: 13,
        color: AppColors.text
      }}
    />
  )
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style="dark" />
        <View style={{ flex: 1, paddingBottom: 15, backgroundColor: AppColors.background }}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: AppColors.background },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(admin-tabs)" />
            <Stack.Screen name="login" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="register" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="verify-email" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="forgot-password" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="reset-password" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="product/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="mix-match" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="checkout" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="checkout-payment" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="order-success" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="order-tracking" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="order-my" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="order-detail" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="addresses" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="guide" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="about" options={{ animation: 'slide_from_right' }} />
          </Stack>
        </View>
      </AuthProvider>
      <Toast config={toastConfig} />
    </GestureHandlerRootView>
  );
}
