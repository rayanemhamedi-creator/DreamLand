import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useApp } from '../context/AppContext';
import axios from 'axios';
import CONFIG from '../../config';

export default function Footer({ onPressAccueil }) {
  const { t, theme, isRTL, lang } = useApp();

  // Modals Visibility
  const [conditionsVisible, setConditionsVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [contactVisible, setContactVisible] = useState(false);

  // Contact Form States
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [contactStatus, setContactStatus] = useState('idle'); // idle, sending, success, error

  // Statistics State for About Modal
  const [stats, setStats] = useState({
    totalHotels: 0,
    totalRestaurants: 0,
    totalCafes: 0,
    totalCinemas: 0,
    totalGuides: 0,
    totalSports: 0,
    totalEvenements: 0,
    totalTouristes: 0
  });

  // Fetch stats when About modal opens
  useEffect(() => {
    if (aboutVisible) {
      axios.get(`${CONFIG.API_URL}/utilisateurs/public-stats`)
        .then(res => {
          if (res.data) {
            setStats(res.data);
          }
        })
        .catch(err => {
          console.warn("Failed to fetch public stats in mobile footer:", err.message);
        });
    }
  }, [aboutVisible]);

  // Handle support message submission
  const handleContactSubmit = async () => {
    if (!email.trim() || !message.trim()) {
      Alert.alert(lang === 'ar' ? 'تنبيه' : 'Attention', lang === 'ar' ? 'يرجى ملء جميع الحقول.' : 'Veuillez remplir tous les champs.');
      return;
    }

    // Email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert(lang === 'ar' ? 'تنبيه' : 'Attention', lang === 'ar' ? 'يرجى إدخال بريد إلكتروني صالح.' : 'Veuillez entrer une adresse email valide.');
      return;
    }

    setContactStatus('sending');
    try {
      await axios.post(`${CONFIG.API_URL}/notifications/guest-contact`, {
        email: email.trim(),
        message: message.trim()
      });
      setContactStatus('success');
      setMessage('');
      // Auto close after 3 seconds
      setTimeout(() => {
        setContactVisible(false);
        setContactStatus('idle');
      }, 2500);
    } catch (err) {
      console.warn("Contact support submit error:", err.message);
      setContactStatus('error');
    }
  };

  const handleOpenURL = (url) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Erreur', 'Impossible d\'ouvrir le lien.');
    });
  };

  return (
    <View style={[styles.footer, { backgroundColor: theme.secondary }]}>
      {/* ── Brand Section ── */}
      <View style={[styles.brandRow, isRTL && styles.rowReverse]}>
        <Image
          source={require('../../assets/logodreamland.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.brandText, { color: theme.primary }]}>DreamLand</Text>
      </View>
      
      <Text style={[styles.description, isRTL && styles.rtl]}>{t.footer.about}</Text>

      {/* Social Media Links */}
      <View style={[styles.socialRow, isRTL && styles.rowReverse]}>
        <TouchableOpacity 
          onPress={() => handleOpenURL('https://facebook.com')} 
          style={styles.socialBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.socialEmoji}>📘</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => handleOpenURL('https://instagram.com')} 
          style={styles.socialBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.socialEmoji}>📸</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => handleOpenURL('https://twitter.com')} 
          style={styles.socialBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.socialEmoji}>🐦</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      {/* ── Navigation Section ── */}
      <Text style={[styles.sectionTitle, isRTL && styles.rtl, { color: '#ffffff' }]}>
        {t.footer.navigation.toUpperCase()}
      </Text>
      
      <View style={styles.linksContainer}>
        <TouchableOpacity onPress={onPressAccueil} style={[styles.linkBtn, isRTL && styles.alignRight]} activeOpacity={0.7}>
          <Text style={styles.linkText}>• Accueil</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setConditionsVisible(true)} style={[styles.linkBtn, isRTL && styles.alignRight]} activeOpacity={0.7}>
          <Text style={styles.linkText}>• Conditions générales</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setAboutVisible(true)} style={[styles.linkBtn, isRTL && styles.alignRight]} activeOpacity={0.7}>
          <Text style={styles.linkText}>• À propos</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      {/* ── Contact Section ── */}
      <Text style={[styles.sectionTitle, isRTL && styles.rtl, { color: '#ffffff' }]}>
        {t.footer.contact.toUpperCase()}
      </Text>

      <View style={styles.contactDetails}>
        <Text style={[styles.contactText, isRTL && styles.rtl]}>📍 Houmt Souk, Djerba, {t.footer.country}</Text>
        <Text style={[styles.contactText, isRTL && styles.rtl]}>✉️ support@dreamland.com</Text>
        
        <TouchableOpacity 
          onPress={() => setContactVisible(true)} 
          style={[styles.contactButton, { backgroundColor: theme.primary }]}
          activeOpacity={0.8}
        >
          <Text style={styles.contactBtnText}>💬 Contactez-nous</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      {/* ── Copyright Section ── */}
      <Text style={[styles.credit, isRTL && styles.rtl]}>© 2026 DreamLand — {t.footer.credit}</Text>
      <Text style={styles.version}>Version Mobile 1.0.0</Text>

      {/* ──────────────────────────────────────────────────────── */}
      {/* 📋 CONDITIONS GENERALES MODAL */}
      {/* ──────────────────────────────────────────────────────── */}
      <Modal
        visible={conditionsVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setConditionsVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.modalBg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.borderColor }]}>
            <Text style={[styles.modalTitle, { color: theme.textMain }]}>📋 Conditions Générales</Text>
            <TouchableOpacity onPress={() => setConditionsVisible(false)} style={styles.closeBtn}>
              <Text style={[styles.closeBtnText, { color: theme.textMain }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
              En créant un compte sur notre plateforme ou en utilisant nos services, vous acceptez de respecter les présentes Conditions Générales d'Utilisation (CGU).
            </Text>

            <View style={[styles.sectionCard, { backgroundColor: theme.bgPage, borderColor: theme.borderColor }]}>
              <Text style={[styles.cardHeading, { color: theme.primary }]}>1. Utilisation du Service</Text>
              <Text style={[styles.cardBody, { color: theme.textMain }]}>
                DreamLand est une plateforme destinée à faciliter la mise en relation entre les touristes et les prestataires locaux de l'île de Djerba (Hôtels, Restaurants, Cafés, Cinémas, Sports et Guides). Vous vous engagez à utiliser la plateforme de manière légale et respectueuse.
              </Text>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: theme.bgPage, borderColor: theme.borderColor }]}>
              <Text style={[styles.cardHeading, { color: theme.primary }]}>2. Responsabilité des Utilisateurs</Text>
              <Text style={[styles.cardSubheading, { color: theme.textMain }]}>• Touristes :</Text>
              <Text style={[styles.cardBody, { color: theme.textMuted, marginLeft: 8 }]}>
                Les réservations effectuées doivent être honorées. Tout abus ou comportement inapproprié pourra entraîner la suspension du compte.
              </Text>
              <Text style={[styles.cardSubheading, { color: theme.textMain, marginTop: 6 }]}>• Prestataires :</Text>
              <Text style={[styles.cardBody, { color: theme.textMuted, marginLeft: 8 }]}>
                Vous êtes tenus de fournir des informations exactes concernant vos services, tarifs et disponibilités.
              </Text>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: theme.bgPage, borderColor: theme.borderColor }]}>
              <Text style={[styles.cardHeading, { color: theme.primary }]}>3. Avis et Évaluations</Text>
              <Text style={[styles.cardBody, { color: theme.textMain }]}>
                Les avis doivent être honnêtes, objectifs et ne contenir aucun propos diffamatoire, injurieux ou inapproprié. DreamLand se réserve le droit de modérer tout contenu.
              </Text>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: theme.bgPage, borderColor: theme.borderColor }]}>
              <Text style={[styles.cardHeading, { color: theme.primary }]}>4. Protection des Données</Text>
              <Text style={[styles.cardBody, { color: theme.textMain }]}>
                Vos données personnelles (nom, email, téléphone) sont collectées dans le seul but de traiter vos réservations et d'améliorer votre expérience. Elles ne seront en aucun cas vendues à des tiers.
              </Text>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: theme.bgPage, borderColor: theme.borderColor }]}>
              <Text style={[styles.cardHeading, { color: theme.primary }]}>5. Limitation de Responsabilité</Text>
              <Text style={[styles.cardBody, { color: theme.textMain }]}>
                DreamLand agit uniquement en tant qu'intermédiaire technique. Nous ne saurions être tenus responsables en cas d'annulation ou de litige survenu lors de l'exécution d'une prestation.
              </Text>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: theme.bgPage, borderColor: theme.borderColor }]}>
              <Text style={[styles.cardHeading, { color: theme.primary }]}>6. Politique d'Annulation</Text>
              <Text style={[styles.cardBody, { color: theme.textMain }]}>
                Sauf mention contraire spécifique définie par le prestataire, les règles standard sont :
              </Text>
              <Text style={[styles.cardBody, { color: theme.textMuted, marginTop: 4 }]}>
                • Plus de 48h avant : Remboursement intégral (100%).{'\n'}
                • Entre 24h et 48h : Remboursement partiel (50%).{'\n'}
                • Moins de 24h : Aucun remboursement.
              </Text>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: theme.bgPage, borderColor: theme.borderColor }]}>
              <Text style={[styles.cardHeading, { color: theme.primary }]}>7. Commission</Text>
              <Text style={[styles.cardBody, { color: theme.textMain }]}>
                L'inscription est gratuite pour tous. Pour assurer le service, l'administration prélève une commission fixe sur chaque transaction finale, déduite des revenus des prestataires.
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ──────────────────────────────────────────────────────── */}
      {/* 🌴 ABOUT MODAL ("A PROPOS") */}
      {/* ──────────────────────────────────────────────────────── */}
      <Modal
        visible={aboutVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAboutVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.modalBg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.borderColor }]}>
            <Text style={[styles.modalTitle, { color: theme.textMain }]}>🌴 À Propos de DreamLand</Text>
            <TouchableOpacity onPress={() => setAboutVisible(false)} style={styles.closeBtn}>
              <Text style={[styles.closeBtnText, { color: theme.textMain }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.aboutHeroCard}>
              <Text style={styles.aboutHeroBadge}>{t.about.badge}</Text>
              <Text style={styles.aboutHeroTitle}>
                {t.about.title_part1} {'\n'}
                <Text style={{ color: theme.primary }}>{t.about.title_part2}</Text>
              </Text>
              <Text style={styles.aboutHeroSubtitle}>{t.about.subtitle}</Text>
            </View>

            {/* Statistics Dashboard */}
            <Text style={[styles.sectionHeading, { color: theme.textMain }]}>📊 Nos statistiques live</Text>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: theme.bgPage, borderColor: theme.borderColor }]}>
                <Text style={styles.statIcon}>🏢</Text>
                <Text style={[styles.statNum, { color: theme.primary }]}>{stats.totalHotels}</Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>{t.about.stats.hotels}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.bgPage, borderColor: theme.borderColor }]}>
                <Text style={styles.statIcon}>☕</Text>
                <Text style={[styles.statNum, { color: theme.primary }]}>{stats.totalRestaurants}</Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>{t.about.stats.restaurants}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.bgPage, borderColor: theme.borderColor }]}>
                <Text style={styles.statIcon}>🍵</Text>
                <Text style={[styles.statNum, { color: theme.primary }]}>{stats.totalCafes}</Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>{t.about.stats.cafes}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.bgPage, borderColor: theme.borderColor }]}>
                <Text style={styles.statIcon}>🎬</Text>
                <Text style={[styles.statNum, { color: theme.primary }]}>{stats.totalCinemas}</Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>{t.about.stats.cinemas}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.bgPage, borderColor: theme.borderColor }]}>
                <Text style={styles.statIcon}>🗺️</Text>
                <Text style={[styles.statNum, { color: theme.primary }]}>{stats.totalGuides}</Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>{t.about.stats.guides}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.bgPage, borderColor: theme.borderColor }]}>
                <Text style={styles.statIcon}>🚴</Text>
                <Text style={[styles.statNum, { color: theme.primary }]}>{stats.totalSports}</Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>{t.about.stats.sports}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.bgPage, borderColor: theme.borderColor }]}>
                <Text style={styles.statIcon}>🎈</Text>
                <Text style={[styles.statNum, { color: theme.primary }]}>{stats.totalEvenements}</Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>{t.about.stats.events}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.bgPage, borderColor: theme.borderColor }]}>
                <Text style={styles.statIcon}>👥</Text>
                <Text style={[styles.statNum, { color: theme.primary }]}>{stats.totalTouristes}+</Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>{t.about.stats.tourists}</Text>
              </View>
            </View>

            {/* Mission Section */}
            <Text style={[styles.sectionHeading, { color: theme.textMain }]}>🚀 {t.about.mission.title}</Text>
            <View style={[styles.sectionCard, { backgroundColor: theme.bgPage, borderColor: theme.borderColor }]}>
              <Text style={[styles.cardBody, { color: theme.textMain, lineHeight: 22 }]}>
                {t.about.mission.desc}
              </Text>
              <View style={styles.missionList}>
                <Text style={[styles.missionItem, { color: theme.textMain }]}>✓ {t.about.mission.item1}</Text>
                <Text style={[styles.missionItem, { color: theme.textMain }]}>✓ {t.about.mission.item2}</Text>
                <Text style={[styles.missionItem, { color: theme.textMain }]}>✓ {t.about.mission.item3}</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ──────────────────────────────────────────────────────── */}
      {/* 💬 CONTACT SUPPORT MODAL */}
      {/* ──────────────────────────────────────────────────────── */}
      <Modal
        visible={contactVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setContactVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.modalBg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.borderColor }]}>
            <Text style={[styles.modalTitle, { color: theme.textMain }]}>💬 Support & Contact</Text>
            <TouchableOpacity onPress={() => setContactVisible(false)} style={styles.closeBtn}>
              <Text style={[styles.closeBtnText, { color: theme.textMain }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            {contactStatus === 'success' ? (
              <View style={styles.successContainer}>
                <Text style={styles.successIcon}>✅</Text>
                <Text style={[styles.successTitle, { color: theme.textMain }]}>Message Envoyé !</Text>
                <Text style={[styles.successDesc, { color: theme.textMuted }]}>
                  L'administrateur vous répondra très prochainement par email. Merci !
                </Text>
              </View>
            ) : (
              <View style={styles.formContainer}>
                <Text style={[styles.formIntro, { color: theme.textMuted }]}>
                  Vous avez une question ou un problème ? Envoyez-nous un message et notre équipe de support vous répondra dans les plus brefs délais.
                </Text>

                {/* Email Field */}
                <Text style={styles.inputLabel}>VOTRE EMAIL</Text>
                <TextInput
                  style={[styles.textInput, {
                    backgroundColor: theme.bgPage,
                    borderColor: theme.borderColor,
                    color: theme.textMain
                  }]}
                  placeholder="exemple@email.com"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />

                {/* Message Field */}
                <Text style={styles.inputLabel}>MESSAGE</Text>
                <TextInput
                  style={[styles.textArea, {
                    backgroundColor: theme.bgPage,
                    borderColor: theme.borderColor,
                    color: theme.textMain
                  }]}
                  placeholder="Comment pouvons-nous vous aider ?"
                  placeholderTextColor={theme.textMuted}
                  multiline
                  numberOfLines={5}
                  value={message}
                  onChangeText={setMessage}
                />

                {contactStatus === 'error' && (
                  <View style={styles.errorAlert}>
                    <Text style={styles.errorAlertText}>
                      ⚠️ Une erreur est survenue lors de l'envoi. Veuillez vérifier votre connexion et réessayer.
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: theme.primary }]}
                  onPress={handleContactSubmit}
                  disabled={contactStatus === 'sending'}
                  activeOpacity={0.85}
                >
                  {contactStatus === 'sending' ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitBtnText}>Envoyer le message</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    marginTop: 24,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  logo: {
    width: 120,
    height: 60,
    marginRight: -10,
    marginLeft: -20,
  },
  brandText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  description: {
    color: 'rgba(248, 250, 252, 0.65)',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 20,
  },
  rtl: {
    textAlign: 'right',
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  socialBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialEmoji: {
    fontSize: 18,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(248, 250, 252, 0.1)',
    width: '100%',
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 16,
    letterSpacing: 1,
  },
  linksContainer: {
    gap: 10,
  },
  linkBtn: {
    paddingVertical: 4,
  },
  linkText: {
    color: 'rgba(248, 250, 252, 0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  contactDetails: {
    gap: 8,
  },
  contactText: {
    color: 'rgba(248, 250, 252, 0.6)',
    fontSize: 14,
    lineHeight: 22,
  },
  contactButton: {
    alignSelf: 'flex-start',
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 100,
  },
  contactBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  credit: {
    color: 'rgba(248, 250, 252, 0.6)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  version: {
    color: 'rgba(248, 250, 252, 0.25)',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  modalSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
  },
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardHeading: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  cardSubheading: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 20,
  },

  // About Modal Hero
  aboutHeroCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  aboutHeroBadge: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    color: '#f97316',
    fontSize: 11,
    fontWeight: '800',
    borderRadius: 100,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  aboutHeroTitle: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    color: '#ffffff',
    lineHeight: 32,
    marginBottom: 12,
  },
  aboutHeroSubtitle: {
    color: 'rgba(248, 250, 252, 0.75)',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 12,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statNum: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  missionList: {
    marginTop: 12,
    gap: 10,
  },
  missionItem: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Contact Form Modal
  formContainer: {
    gap: 16,
  },
  formIntro: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  textInput: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  textArea: {
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  submitButton: {
    height: 52,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorAlertText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  successIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 10,
  },
  successDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  }
});
