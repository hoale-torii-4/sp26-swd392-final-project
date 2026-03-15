import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { AppColors } from '../constants/theme';

export default function CheckoutScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/checkout-payment' as any);
  }, [router]);

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
