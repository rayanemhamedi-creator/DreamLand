import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useApp } from '../context/AppContext';

const CATEGORY_COLORS = {
  'Hôtel': '#3b82f6',
  'Restaurant': '#ec4899',
  'Café': '#d97706',
  'Sport': '#10b981',
  'Cinéma': '#8b5cf6',
  'Guide': '#06b6d4',
  'Événement': '#f59e0b',
};

const CATEGORY_ICONS = {
  'Hôtel': '🏨', 'Restaurant': '🍽️', 'Café': '☕', 'Sport': '🚴',
  'Cinéma': '🎬', 'Guide': '🗺️', 'Événement': '🎈',
};

export default function ShowcaseCard({ item, onPress }) {
  const { t, theme, isRTL } = useApp();

  const imageUrls = item.urlImage ? item.urlImage.split(',').filter(Boolean) : [];
  const mainImage = imageUrls.length > 0 ? imageUrls[0].trim() : null;

  const categoryColor = CATEGORY_COLORS[item.category] || theme.primary;
  const categoryIcon = CATEGORY_ICONS[item.category] || '📍';

  // Price display: hotel has multi-formula prices, others have prix
  const priceDisplay = () => {
    if (item.category === 'Hôtel') {
      const prices = [item.prixRO, item.prixBB, item.prixHB, item.prixFB, item.prixSoftAI, item.prixAllInclusive, item.prix]
        .filter(p => p != null && p !== '' && Number(p) > 0);
      if (prices.length > 0) {
        const min = Math.min(...prices.map(Number));
        return `${t.home.from} ${min} DT`;
      }
    }
    if (item.prix) return `${Number(item.prix).toFixed(0)} DT`;
    return t.home.on_request;
  };

  const locationText = item.adresse || item.lieu || item.localisation || 'Djerba, Tunisie';

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}
      style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderColor }, theme.shadowMd]}>

      {/* Cover Image */}
      <View style={styles.imageContainer}>
        {mainImage ? (
          <Image source={{ uri: mainImage }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: theme.borderColor }]}>
            <Text style={styles.placeholderIcon}>{categoryIcon}</Text>
          </View>
        )}
        <View style={[styles.categoryTag, { backgroundColor: categoryColor }]}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
      </View>

      {/* Card Content */}
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.textMain }, isRTL && styles.rtl]} numberOfLines={1}>
          {item.title}
        </Text>

        <View style={[styles.locationContainer, isRTL && styles.rowReverse]}>
          <Text style={styles.locationIcon}>📍</Text>
          <Text style={[styles.locationText, { color: theme.textMuted }]} numberOfLines={1}>
            {locationText}
          </Text>
        </View>

        {item.description ? (
          <Text style={[styles.description, { color: theme.textMuted }, isRTL && styles.rtl]} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <View style={[styles.cardFooter, { borderTopColor: theme.borderColor }]}>
          <View>
            <Text style={[styles.priceLabel, { color: theme.textMuted }]}>Tarif</Text>
            <Text style={[styles.priceValue, { color: theme.primary }]}>{priceDisplay()}</Text>
          </View>
          <View style={[styles.btn, { borderColor: 'rgba(249,115,22,0.25)', backgroundColor: 'rgba(249,115,22,0.08)' }]}>
            <Text style={[styles.btnText, { color: theme.primary }]}>{t.home.view_details}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, overflow: 'hidden', marginBottom: 20, borderWidth: 1 },
  imageContainer: { height: 180, width: '100%', position: 'relative', backgroundColor: '#cbd5e1' },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  placeholderIcon: { fontSize: 48 },
  categoryTag: { position: 'absolute', top: 12, left: 12, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 100 },
  categoryText: { color: '#fff', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  content: { padding: 16 },
  title: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  rtl: { textAlign: 'right' },
  rowReverse: { flexDirection: 'row-reverse' },
  locationContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  locationIcon: { fontSize: 13, marginRight: 4 },
  locationText: { fontSize: 13, fontWeight: '600', flex: 1 },
  description: { fontSize: 13, lineHeight: 18, marginBottom: 16 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 12 },
  priceLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  priceValue: { fontSize: 16, fontWeight: '800' },
  btn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1 },
  btnText: { fontWeight: '700', fontSize: 12 },
});
