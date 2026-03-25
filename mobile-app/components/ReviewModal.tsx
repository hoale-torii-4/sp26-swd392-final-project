import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, BorderRadius, Spacing } from '../constants/theme';

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, content: string) => Promise<void>;
  productName: string;
  loading?: boolean;
}

export default function ReviewModal({
  visible,
  onClose,
  onSubmit,
  productName,
  loading = false,
}: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');

  const handleSubmit = async () => {
    if (rating === 0) return;
    await onSubmit(rating, content);
    // Reset state after successful submit is handled externally
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); onClose(); }}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.container}
            >
              <View style={styles.header}>
                <Text style={styles.title}>Đánh giá sản phẩm</Text>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={24} color={AppColors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.subtitle}>
                  Bạn cảm thấy thế nào về <Text style={{ fontWeight: '700' }}>{productName}</Text>?
                </Text>

                <View style={styles.starsContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setRating(star)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={star <= rating ? 'star' : 'star-outline'}
                        size={40}
                        color={star <= rating ? '#F59E0B' : '#D1D5DB'}
                        style={styles.star}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.ratingText}>
                  {rating === 1 && 'Tệ'}
                  {rating === 2 && 'Không hài lòng'}
                  {rating === 3 && 'Bình thường'}
                  {rating === 4 && 'Hài lòng'}
                  {rating === 5 && 'Tuyệt vời'}
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Hãy chia sẻ trải nghiệm của bạn về sản phẩm này nhé (tùy chọn)..."
                  placeholderTextColor={AppColors.textMuted}
                  multiline
                  numberOfLines={4}
                  value={content}
                  onChangeText={setContent}
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  style={[styles.submitBtn, (loading || rating === 0) && styles.submitBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={loading || rating === 0}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.submitText}>Gửi đánh giá</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

import { ScrollView } from 'react-native';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: AppColors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
  },
  content: {
    paddingTop: 20,
  },
  subtitle: {
    fontSize: 15,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  star: {
    marginHorizontal: 8,
  },
  ratingText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
    marginBottom: 24,
    minHeight: 20,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    borderRadius: BorderRadius.md,
    padding: 16,
    fontSize: 14,
    color: AppColors.text,
    minHeight: 120,
    marginBottom: 24,
  },
  submitBtn: {
    backgroundColor: AppColors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
