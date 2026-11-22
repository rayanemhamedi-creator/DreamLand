import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image } from 'react-native';
import { useApp } from '../context/AppContext';

const LANGS = [
  { key: 'fr', flag: '🇫🇷' },
  { key: 'en', flag: '🇬🇧' },
  { key: 'ar', flag: '🇸🇦' },
];

export default function HeroHeader({ searchQuery, setSearchQuery }) {
  const { t, theme, isDark, toggleTheme, lang, changeLang, isRTL } = useApp();

  return (
    <View style={[styles.hero, { backgroundColor: theme.bgHeader }]}>
      {/* Top bar: lang switcher + theme toggle */}
      <View style={styles.topBar}>
        <View style={styles.langRow}>
          {LANGS.map(l => (
            <TouchableOpacity
              key={l.key}
              onPress={() => changeLang(l.key)}
              style={[
                styles.langBtn,
                lang === l.key && { backgroundColor: theme.primary, borderColor: theme.primary },
                { borderColor: 'rgba(255,255,255,0.2)' },
              ]}
              activeOpacity={0.8}
            >
              <Text style={styles.langFlag}>{l.flag}</Text>
              <Text style={[styles.langText, lang === l.key && { color: '#fff', fontWeight: '800' }]}>
                {l.key.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={toggleTheme}
          style={[styles.themeBtn, { backgroundColor: isDark ? '#f97316' : 'rgba(255,255,255,0.15)' }]}
          activeOpacity={0.8}
        >
          <Text style={styles.themeIcon}>{isDark ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
      </View>

      {/* Logo */}
      <View style={styles.logoRow}>
        <Image source={require('../../assets/logodreamland.png')} style={styles.headerLogo} resizeMode="contain" />
        <Text style={[styles.logoText, { color: '#fff' }]}>DreamLand</Text>
      </View>

      {/* Badge */}
      <View style={styles.badgeWrap}>
        <Text style={styles.badge}>{t.home.badge}</Text>
      </View>

      {/* Title */}
      <Text style={[styles.title, isRTL && styles.rtl]}>
        <Text style={{ color: '#fff' }}>{t.home.title_part1} </Text>
        <Text style={{ color: theme.primary }}>{t.home.title_part2}</Text>
        {'\n'}
        <Text style={{ color: '#fff' }}>{t.home.title_part3}</Text>
      </Text>

      {/* Subtitle */}
      <Text style={[styles.subtitle, isRTL && styles.rtl]}>{t.home.subtitle}</Text>

      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: theme.inputBg }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          placeholder={t.home.search_placeholder}
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchInput, { color: theme.textMain }]}
          textAlign={isRTL ? 'right' : 'left'}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: 16,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  langRow: { flexDirection: 'row', gap: 6 },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    gap: 4,
  },
  langFlag: { fontSize: 14 },
  langText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  themeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeIcon: { fontSize: 18 },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  headerLogo: { width: 60, height: 60, marginRight: 10 },
  logoText: { fontSize: 18, fontWeight: '800' },
  badgeWrap: {
    backgroundColor: 'rgba(249,115,22,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.3)',
    borderRadius: 100,
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  badge: { color: '#f97316', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  title: {
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 38,
    marginBottom: 10,
    color: '#fff',
  },
  rtl: { textAlign: 'right' },
  subtitle: {
    fontSize: 13,
    color: 'rgba(248,250,252,0.65)',
    lineHeight: 20,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 14 },
  clearIcon: { fontSize: 14, color: '#94a3b8', paddingHorizontal: 4 },
});
