import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppColors, Spacing, BorderRadius } from '../constants/theme';

export default function OrderDetailScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string }>();

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Mã đơn hàng</Text>
        <Text style={styles.code}>#{(code ?? '').toString().toUpperCase()}</Text>
        <Text style={styles.desc}>
          Màn hình chi tiết đơn hàng sẽ được bổ sung tiếp theo (data theo backend).
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.background },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 16,
    paddingHorizontal: Spacing.lg,
  },
  backBtn: { marginBottom: 10 },
  backText: { fontSize: 14, color: AppColors.primary, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: AppColors.text },
  card: {
    backgroundColor: AppColors.surface,
    margin: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  title: { fontSize: 12, color: AppColors.textMuted, textTransform: 'uppercase' },
  code: { fontSize: 20, fontWeight: '800', color: AppColors.primary, marginVertical: 6 },
  desc: { fontSize: 13, color: AppColors.textSecondary },
});
