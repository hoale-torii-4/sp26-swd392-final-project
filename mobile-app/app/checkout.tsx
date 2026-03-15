import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AppColors } from '../constants/theme';

export default function CheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    selectedItems?: string;
    items?: string;
    totalAmount?: string;
    totalItems?: string;
    buyNow?: string;
  }>();

  useEffect(() => {
    router.replace({
      pathname: '/checkout-payment' as any,
      params,
    });
  }, [router, params]);

  return (
    <View style={styles.center}>
      <Text style={styles.text}>Đang chuyển tới thanh toán...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: AppColors.background },
  text: { color: AppColors.textSecondary, fontSize: 14 },
});
