import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { AppColors, Spacing, BorderRadius } from '../constants/theme';

const coreValues = [
  {
    title: 'Tầm nhìn',
    desc: 'Trở thành biểu tượng quà tặng văn hóa hàng đầu Việt Nam, đưa giá trị nghệ thuật truyền thống vươn tầm thế giới.',
  },
  {
    title: 'Sứ mệnh',
    desc: 'Kết nối các thế hệ thông qua nghệ thuật tặng quà tinh tế, gìn giữ hồn cốt dân tộc trong từng hộp quà hiện đại.',
  },
  {
    title: 'Cam kết',
    desc: '100% nguyên liệu chọn lọc, bền vững và quản lý chất lượng nghiêm ngặt tới từng chi tiết nhỏ nhất.',
  },
];

export default function AboutScreen() {
  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Gói trọn phong vị Tết xưa</Text>
        <Text style={styles.heroSubtitle}>trong thức quà hiện đại</Text>
        <Text style={styles.heroDesc}>
          Hành trình gìn giữ những giá trị văn hóa truyền thống.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Câu Chuyện Của Chúng Tôi</Text>
        <Text style={styles.sectionDesc}>
          Lộc Xuân ra đời từ niềm đam mê với những nét đẹp cổ truyền, mong muốn mang
          hơi thở của quá khứ vào nhịp sống hiện đại.
        </Text>
      </View>

      <View style={styles.sectionAlt}>
        <Text style={styles.sectionTitle}>Nguồn Cội & Tâm Huyết</Text>
        <Text style={styles.sectionDesc}>
          Mỗi chiếc hộp quà được chăm chút tỉ mỉ từ khâu chọn nguyên liệu đến bao bì,
          mang đậm dấu ấn mỹ thuật Việt Nam.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tinh Hoa Hội Tụ</Text>
        <Text style={styles.sectionDesc}>
          Tuyển chọn từ các làng nghề truyền thống và nhà sản xuất uy tín trên khắp Việt Nam.
        </Text>
      </View>

      <View style={styles.sectionDark}>
        <Text style={styles.sectionTitleDark}>Giá Trị Cốt Lõi</Text>
        {coreValues.map((v) => (
          <View key={v.title} style={styles.coreCard}>
            <Text style={styles.coreTitle}>{v.title}</Text>
            <Text style={styles.coreDesc}>{v.desc}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.quote}>"Hãy để Lộc Xuân giúp bạn viết tiếp những câu chuyện tri ân nghĩa
          trong mùa Tết này."</Text>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.background },
  hero: {
    backgroundColor: AppColors.dark,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    paddingHorizontal: Spacing.xl,
  },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  heroSubtitle: { fontSize: 24, fontWeight: '800', color: AppColors.accent, fontStyle: 'italic' },
  heroDesc: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 10 },

  section: { padding: Spacing.xl, backgroundColor: AppColors.background },
  sectionAlt: { padding: Spacing.xl, backgroundColor: AppColors.surface },
  sectionDark: { padding: Spacing.xl, backgroundColor: '#5A0A0A' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: AppColors.primary, marginBottom: 10 },
  sectionTitleDark: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 10 },
  sectionDesc: { fontSize: 13, color: AppColors.textSecondary, lineHeight: 20 },

  coreCard: {
    backgroundColor: '#7A1717',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: 10,
  },
  coreTitle: { fontSize: 16, fontWeight: '700', color: '#FFF', marginBottom: 6 },
  coreDesc: { fontSize: 12, color: '#E5E7EB', lineHeight: 18 },

  quote: { fontSize: 16, fontStyle: 'italic', color: AppColors.primary, textAlign: 'center', lineHeight: 22 },
});
