import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useApp } from '../context/AppContext';

export default function CategorySelector({ activeCategory, setActiveCategory }) {
  const { t, theme, isRTL } = useApp();

  const CATEGORIES = [
    { key: 'Tous', label: t.home.category_all, icon: '🌟' },
    { key: 'Hôtel', label: t.home.category_hotel, icon: '🏨' },
    { key: 'Restaurant', label: t.home.category_restaurant, icon: '🍽️' },
    { key: 'Café', label: t.home.category_cafe, icon: '☕' },
    { key: 'Sport', label: t.home.category_sport, icon: '🚴' },
    { key: 'Cinéma', label: t.home.category_cinema, icon: '🎬' },
    { key: 'Guide', label: t.home.category_guide, icon: '🗺️' },
    { key: 'Événement', label: t.home.category_event, icon: '🎈' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.bgPage }]}>
      <Text style={[styles.sectionTitle, { color: theme.textMain }, isRTL && styles.rtl]}>
        {t.home.section_title}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              activeOpacity={0.7}
              onPress={() => setActiveCategory(cat.key)}
              style={[
                styles.chip,
                { borderColor: isActive ? theme.primary : theme.borderColor },
                { backgroundColor: isActive ? theme.chipActive : theme.chipInactive },
                theme.shadowSm,
              ]}
            >
              <Text style={styles.chipIcon}>{cat.icon}</Text>
              <Text style={[
                styles.chipLabel,
                { color: isActive ? theme.chipTextActive : theme.chipTextInactive }
              ]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 16 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  rtl: { textAlign: 'right' },
  scrollContainer: { paddingHorizontal: 12, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 100,
    borderWidth: 1,
  },
  chipIcon: { fontSize: 16, marginRight: 6 },
  chipLabel: { fontSize: 13, fontWeight: '700' },
});
