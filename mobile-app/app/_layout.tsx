import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../contexts/AuthContext';
import { AppColors } from '../constants/theme';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: AppColors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="register" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="verify-email" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="forgot-password" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="reset-password" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="product/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="checkout" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="checkout-payment" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="order-success" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="order-tracking" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="order-detail" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="addresses" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="guide" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="about" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </AuthProvider>
  );
}
