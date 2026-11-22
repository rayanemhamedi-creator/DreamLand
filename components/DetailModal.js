import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, Image, ScrollView,
  TouchableOpacity, Dimensions, Linking, Alert, ActivityIndicator
} from 'react-native';
import { useApp } from '../context/AppContext';
import chambreService from '../services/chambreService';
import tableRestoService from '../services/tableRestoService';
import evenementService from '../services/evenementService';

const { width } = Dimensions.get('window');

// ── Amenity chip for hotels ──────────────────────────────────
function AmenityChip({ icon, label, active, theme }) {
  if (!active) return null;
  return (
    <View style={[styles.amenityChip, { backgroundColor: 'rgba(249,115,22,0.1)', borderColor: 'rgba(249,115,22,0.2)' }]}>
      <Text style={styles.amenityIcon}>{icon}</Text>
      <Text style={[styles.amenityLabel, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

// ── Section title ────────────────────────────────────────────
function SectionTitle({ title, theme }) {
  return (
    <Text style={[styles.sectionTitle, { color: theme.textMain, borderBottomColor: theme.borderColor }]}>
      {title}
    </Text>
  );
}

// ── Info row ─────────────────────────────────────────────────
function InfoRow({ icon, label, value, theme }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: theme.textMuted }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: theme.textMain }]}>{value}</Text>
      </View>
    </View>
  );
}

// ── Hotel specific section ───────────────────────────────────
function HotelSection({ item, rooms, loadingRooms, t, theme }) {
  const [expandedRoomId, setExpandedRoomId] = useState(null);

  const amenities = [
    { icon: '🛎️', key: 'aReception24h', label: t.details.amenities.reception24h },
    { icon: '🔒', key: 'aSecurite24h', label: t.details.amenities.security24h },
    { icon: '📶', key: 'aWifiGenerale', label: t.details.amenities.wifi },
    { icon: '🅿️', key: 'aParking', label: t.details.amenities.parking },
    { icon: '🛗', key: 'aAscenseur', label: t.details.amenities.elevator },
    { icon: '🏊', key: 'aPiscine', label: t.details.amenities.pool },
    { icon: '🏛️', key: 'aServiceReception', label: t.details.amenities.reception_hall },
  ];

  const hasAmenity = amenities.some(a => item[a.key] === true || item[a.key] === 'true');

  const formulas = [
    { key: 'prixRO', label: 'Room Only (RO)' },
    { key: 'prixBB', label: 'Bed & Breakfast (BB)' },
    { key: 'prixHB', label: 'Half Board (HB)' },
    { key: 'prixFB', label: 'Full Board (FB)' },
    { key: 'prixSoftAI', label: 'Soft All Inclusive' },
    { key: 'prixAllInclusive', label: 'All Inclusive' },
  ].filter(f => item[f.key] != null && Number(item[f.key]) > 0);

  return (
    <>
      {hasAmenity && (
        <>
          <SectionTitle title={t.details.highlights} theme={theme} />
          <View style={styles.amenityGrid}>
            {amenities.map(a => (
              <AmenityChip key={a.key} icon={a.icon} label={a.label}
                active={item[a.key] === true || item[a.key] === 'true'} theme={theme} />
            ))}
          </View>
        </>
      )}

      {formulas.length > 0 && (
        <>
          <SectionTitle title="Tarifs des Formules" theme={theme} />
          {formulas.map(f => (
            <View key={f.key} style={[styles.formulaRow, { borderColor: theme.borderColor, backgroundColor: theme.bgPage }]}>
              <Text style={[styles.formulaLabel, { color: theme.textMuted }]}>{f.label}</Text>
              <Text style={[styles.formulaPrice, { color: theme.primary }]}>
                {Number(item[f.key]).toFixed(0)} {t.details.per_night}
              </Text>
            </View>
          ))}
        </>
      )}

      <SectionTitle title={t.details.room_types} theme={theme} />
      {loadingRooms ? (
        <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 12 }} />
      ) : rooms.length === 0 ? (
        <Text style={[styles.emptyNote, { color: theme.textMuted }]}>{t.details.no_rooms}</Text>
      ) : (
        rooms.map((room, i) => {
          const isExpanded = expandedRoomId === room.id;
          return (
            <TouchableOpacity 
              key={room.id || i} 
              activeOpacity={0.85}
              onPress={() => setExpandedRoomId(isExpanded ? null : room.id)}
              style={[
                styles.roomCard, 
                { 
                  borderColor: isExpanded ? theme.primary : theme.borderColor, 
                  backgroundColor: theme.bgPage,
                  height: isExpanded ? 'auto' : 100
                }
              ]}
            >
              <View style={{ flexDirection: 'row', height: 100 }}>
                {room.urlImage ? (
                  <Image source={{ uri: room.urlImage.split(',')[0].trim() }} style={styles.roomImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.roomImagePlaceholder, { backgroundColor: theme.borderColor }]}>
                    <Text style={styles.roomImagePlaceholderIcon}>🏨</Text>
                  </View>
                )}
                <View style={styles.roomDetails}>
                  <Text style={[styles.roomType, { color: theme.textMain }]} numberOfLines={1}>
                    {room.nom || room.type}
                  </Text>
                  <Text style={[styles.roomCapacity, { color: theme.textMuted }]}>👥 {room.capacite} pers.</Text>
                  <Text style={[styles.roomPrice, { color: theme.primary }]}>{Number(room.prix).toFixed(0)} DT / nuit</Text>
                </View>
                <Text style={[styles.expandArrow, { color: theme.textMuted }]}>
                  {isExpanded ? '▲' : '▼'}
                </Text>
              </View>

              {isExpanded && (
                <View style={[styles.roomExpandedContent, { borderTopColor: theme.borderColor }]}>
                  {room.description ? (
                    <Text style={[styles.roomDesc, { color: theme.textMuted }]}>{room.description}</Text>
                  ) : (
                    <Text style={[styles.roomDesc, { color: theme.textMuted, fontStyle: 'italic' }]}>
                      Cette chambre offre tout le confort nécessaire pour un séjour agréable.
                    </Text>
                  )}

                  {/* Bed Configuration */}
                  <View style={styles.bedConfigRow}>
                    <Text style={[styles.bedConfigText, { color: theme.textMain }]}>
                      🛏️ {room.nbLitsSimples || 0} lit(s) simple(s)  •  🛏️ {room.nbLitsDoubles || 0} lit(s) double(s)
                    </Text>
                  </View>

                  {/* Amenities list */}
                  <View style={styles.roomAmenitiesGrid}>
                    {room.aWifi !== false && (
                      <View style={[styles.roomAmenityPill, { backgroundColor: theme.borderColor }]}>
                        <Text style={[styles.roomAmenityText, { color: theme.textMain }]}>📶 Wifi</Text>
                      </View>
                    )}
                    {room.aClimatisation !== false && (
                      <View style={[styles.roomAmenityPill, { backgroundColor: theme.borderColor }]}>
                        <Text style={[styles.roomAmenityText, { color: theme.textMain }]}>❄️ Clim</Text>
                      </View>
                    )}
                    {room.aVueSurMer && (
                      <View style={[styles.roomAmenityPill, { backgroundColor: theme.borderColor }]}>
                        <Text style={[styles.roomAmenityText, { color: theme.textMain }]}>🌊 Vue Mer</Text>
                      </View>
                    )}
                    {room.aBalcon && (
                      <View style={[styles.roomAmenityPill, { backgroundColor: theme.borderColor }]}>
                        <Text style={[styles.roomAmenityText, { color: theme.textMain }]}>🌅 Balcon</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })
      )}
    </>
  );
}

// ── Restaurant specific section ──────────────────────────────
function RestaurantSection({ tables, loadingTables, t, theme }) {
  return (
    <>
      <SectionTitle title={t.details.tables_available} theme={theme} />
      {loadingTables ? (
        <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 12 }} />
      ) : tables.length === 0 ? (
        <Text style={[styles.emptyNote, { color: theme.textMuted }]}>{t.details.no_tables}</Text>
      ) : (
        tables.map((table, i) => (
          <View key={i} style={[styles.formulaRow, { borderColor: theme.borderColor, backgroundColor: theme.bgPage }]}>
            <Text style={[styles.formulaLabel, { color: theme.textMuted }]}>
              Table {table.numero || table.id} — {table.capacite || '?'} {t.details.capacity}
            </Text>
            <Text style={[styles.statusDot, { color: table.disponible !== false ? '#10b981' : '#ef4444' }]}>
              {table.disponible !== false ? '✓ Libre' : '✗ Occupée'}
            </Text>
          </View>
        ))
      )}
    </>
  );
}

// ── Cinema specific section ──────────────────────────────────
function CinemaSection({ item, films, loadingFilms, t, theme }) {
  if (loadingFilms) {
    return <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 12 }} />;
  }
  const displayFilms = films && films.length > 0 ? films : (item.films || []);
  return (
    <>
      <SectionTitle title={t.details.movies_scheduled} theme={theme} />
      {displayFilms.length === 0 ? (
        <Text style={[styles.emptyNote, { color: theme.textMuted }]}>{t.details.no_movies}</Text>
      ) : (
        displayFilms.map((film, i) => (
          <View key={film.id || i} style={[styles.subItemCard, { borderColor: theme.borderColor, backgroundColor: theme.bgPage }]}>
            <View style={{ flexDirection: 'row', height: 90 }}>
              {film.urlImage ? (
                <Image source={{ uri: film.urlImage.split(',')[0].trim() }} style={styles.subItemImage} resizeMode="cover" />
              ) : (
                <View style={[styles.subItemPlaceholder, { backgroundColor: theme.borderColor }]}>
                  <Text style={styles.subItemPlaceholderIcon}>🎬</Text>
                </View>
              )}
              <View style={styles.subItemDetails}>
                <Text style={[styles.subItemTitle, { color: theme.textMain }]} numberOfLines={1}>
                  {film.titre || film.title || `Film ${i + 1}`}
                </Text>
                {film.genre && <Text style={[styles.subItemSub, { color: theme.textMuted }]}>🏷️ {film.genre}</Text>}
                {film.duree && <Text style={[styles.subItemSub, { color: theme.textMuted }]}>⏱️ {film.duree} min</Text>}
              </View>
              <View style={styles.subItemPriceBox}>
                {film.prix && <Text style={[styles.subItemPrice, { color: theme.primary }]}>{film.prix} DT</Text>}
              </View>
            </View>
          </View>
        ))
      )}
    </>
  );
}

// ── Sport specific section ───────────────────────────────────
function SportSection({ item, materiels, loadingMateriels, t, theme }) {
  const displayMateriels = materiels && materiels.length > 0 ? materiels : (item.materielSports || item.materiels || []);
  const horaires = item.horaires || item.heuresOuverture;
  return (
    <>
      <SectionTitle title={t.details.certified_club} theme={theme} />
      <View style={[styles.certBadge, { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)' }]}>
        <Text style={[styles.certText, { color: '#10b981' }]}>✓ {t.details.certified_club}</Text>
      </View>

      {horaires ? (
        <>
          <SectionTitle title={t.details.opening_hours} theme={theme} />
          <Text style={[styles.emptyNote, { color: theme.textMuted }]}>{horaires}</Text>
        </>
      ) : null}

      <SectionTitle title={t.details.available_equipments} theme={theme} />
      {loadingMateriels ? (
        <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 12 }} />
      ) : displayMateriels.length === 0 ? (
        <Text style={[styles.emptyNote, { color: theme.textMuted }]}>{t.details.no_equipment}</Text>
      ) : (
        displayMateriels.map((m, i) => (
          <View key={m.id || i} style={[styles.subItemCard, { borderColor: theme.borderColor, backgroundColor: theme.bgPage }]}>
            <View style={{ flexDirection: 'row', height: 90 }}>
              {m.urlImage ? (
                <Image source={{ uri: m.urlImage.split(',')[0].trim() }} style={styles.subItemImage} resizeMode="cover" />
              ) : (
                <View style={[styles.subItemPlaceholder, { backgroundColor: theme.borderColor }]}>
                  <Text style={styles.subItemPlaceholderIcon}>🚴</Text>
                </View>
              )}
              <View style={styles.subItemDetails}>
                <Text style={[styles.subItemTitle, { color: theme.textMain }]} numberOfLines={1}>
                  {m.nom || m.type || `Équipement ${i + 1}`}
                </Text>
                {m.quantite && <Text style={[styles.subItemSub, { color: theme.textMuted }]}>📦 Quantité: {m.quantite}</Text>}
              </View>
              <View style={styles.subItemPriceBox}>
                {m.prix && <Text style={[styles.subItemPrice, { color: theme.primary }]}>{m.prix} DT</Text>}
              </View>
            </View>
          </View>
        ))
      )}
    </>
  );
}

// ── Guide/Sortie specific section ───────────────────────────
function GuideSection({ item, sorties, loadingSorties, t, theme }) {
  const displaySorties = sorties && sorties.length > 0 ? sorties : (item.sorties || []);
  return (
    <>
      <SectionTitle title={t.details.guide_certified} theme={theme} />
      <View style={[styles.certBadge, { backgroundColor: 'rgba(6,182,212,0.1)', borderColor: 'rgba(6,182,212,0.3)' }]}>
        <Text style={[styles.certText, { color: '#06b6d4' }]}>✓ {t.details.guide_certified}</Text>
      </View>
      <SectionTitle title={t.details.schedule} theme={theme} />
      {loadingSorties ? (
        <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 12 }} />
      ) : displaySorties.length === 0 ? (
        <Text style={[styles.emptyNote, { color: theme.textMuted }]}>{t.details.no_schedule}</Text>
      ) : (
        displaySorties.map((s, i) => (
          <View key={s.id || i} style={[styles.subItemCard, { borderColor: theme.borderColor, backgroundColor: theme.bgPage }]}>
            <View style={{ flexDirection: 'row', height: 90 }}>
              {s.urlImage ? (
                <Image source={{ uri: s.urlImage.split(',')[0].trim() }} style={styles.subItemImage} resizeMode="cover" />
              ) : (
                <View style={[styles.subItemPlaceholder, { backgroundColor: theme.borderColor }]}>
                  <Text style={styles.subItemPlaceholderIcon}>🧭</Text>
                </View>
              )}
              <View style={styles.subItemDetails}>
                <Text style={[styles.subItemTitle, { color: theme.textMain }]} numberOfLines={1}>
                  {s.titre || s.destination || `Circuit ${i + 1}`}
                </Text>
                {s.lieu && <Text style={[styles.subItemSub, { color: theme.textMuted }]} numberOfLines={1}>📍 {s.lieu}</Text>}
                {s.dateDepart && <Text style={{ color: theme.textMuted, fontSize: 12 }}>📅 {s.dateDepart}</Text>}
              </View>
              <View style={styles.subItemPriceBox}>
                {s.prix && <Text style={[styles.subItemPrice, { color: theme.primary }]}>{s.prix} DT</Text>}
              </View>
            </View>
          </View>
        ))
      )}
    </>
  );
}

// ── Event specific section ───────────────────────────────────
function EvenementSection({ item, t, theme }) {
  return (
    <>
      <SectionTitle title={t.details.event_certified} theme={theme} />
      <View style={[styles.certBadge, { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)' }]}>
        <Text style={[styles.certText, { color: '#f59e0b' }]}>✓ {t.details.event_certified}</Text>
      </View>
      {item.dateEvenement && (
        <InfoRow icon="📅" label={t.details.date_time} value={item.dateEvenement} theme={theme} />
      )}
      {item.placesDisponibles != null && (
        <InfoRow icon="🎫" label={t.details.available_tickets} value={String(item.placesDisponibles)} theme={theme} />
      )}
    </>
  );
}

// ── Main DetailModal ─────────────────────────────────────────
export default function DetailModal({ visible, item, onClose }) {
  const { t, theme, isRTL } = useApp();
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [tables, setTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);

  // New DB-retrieved detail states
  const [films, setFilms] = useState([]);
  const [loadingFilms, setLoadingFilms] = useState(false);
  const [materiels, setMateriels] = useState([]);
  const [loadingMateriels, setLoadingMateriels] = useState(false);
  const [sorties, setSorties] = useState([]);
  const [loadingSorties, setLoadingSorties] = useState(false);

  useEffect(() => {
    if (!visible || !item) {
      setRooms([]);
      setTables([]);
      setFilms([]);
      setMateriels([]);
      setSorties([]);
      return;
    }
    if (item.category === 'Hôtel') {
      setLoadingRooms(true);
      chambreService.getChambresParHotel(item.id)
        .then(data => setRooms(data || []))
        .catch(() => setRooms([]))
        .finally(() => setLoadingRooms(false));
    }
    if (item.category === 'Restaurant' || item.category === 'Café') {
      setLoadingTables(true);
      tableRestoService.getTablesParRestaurant(item.id)
        .then(data => setTables(data || []))
        .catch(() => setTables([]))
        .finally(() => setLoadingTables(false));
    }
    if (item.category === 'Cinéma') {
      setLoadingFilms(true);
      evenementService.getFilmsParCinema(item.id)
        .then(data => setFilms(data || []))
        .catch(() => setFilms([]))
        .finally(() => setLoadingFilms(false));
    }
    if (item.category === 'Sport') {
      setLoadingMateriels(true);
      evenementService.getMaterielsParSport(item.id)
        .then(data => setMateriels(data || []))
        .catch(() => setMateriels([]))
        .finally(() => setLoadingMateriels(false));
    }
    if (item.category === 'Guide') {
      setLoadingSorties(true);
      evenementService.getTousLesSorties()
        .then(data => {
          const guideSorties = (data || []).filter(s => s.guide?.id === item.id);
          setSorties(guideSorties);
        })
        .catch(() => setSorties([]))
        .finally(() => setLoadingSorties(false));
    }
  }, [visible, item]);

  if (!item) return null;

  const imageUrls = item.urlImage ? item.urlImage.split(',').filter(Boolean) : [];

  const openMap = () => {
    const loc = item.localisation || item.adresse || item.lieu;
    if (!loc) {
      Alert.alert(t.details.no_location);
      return;
    }
    // If it's "lat, lon" format open with coords, otherwise with text search
    const coords = loc.match(/^-?\d+\.?\d*,\s*-?\d+\.?\d*$/);
    const url = coords
      ? `https://www.google.com/maps?q=${loc.replace(/\s/g, '')}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`;
    Linking.openURL(url).catch(() => Alert.alert('Impossible d\'ouvrir Google Maps'));
  };

  const renderCategorySection = () => {
    switch (item.category) {
      case 'Hôtel': return <HotelSection item={item} rooms={rooms} loadingRooms={loadingRooms} t={t} theme={theme} />;
      case 'Restaurant':
      case 'Café': return <RestaurantSection tables={tables} loadingTables={loadingTables} t={t} theme={theme} />;
      case 'Cinéma': return <CinemaSection item={item} films={films} loadingFilms={loadingFilms} t={t} theme={theme} />;
      case 'Sport': return <SportSection item={item} materiels={materiels} loadingMateriels={loadingMateriels} t={t} theme={theme} />;
      case 'Guide': return <GuideSection item={item} sorties={sorties} loadingSorties={loadingSorties} t={t} theme={theme} />;
      case 'Événement': return <EvenementSection item={item} t={t} theme={theme} />;
      default: return null;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: theme.modalBg }]}>
        {/* Close button */}
        <TouchableOpacity activeOpacity={0.8} onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Image carousel */}
          {imageUrls.length > 0 ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.carousel}>
              {imageUrls.map((url, i) => (
                <Image key={i} source={{ uri: url.trim() }} style={[styles.carouselImage, { width }]} resizeMode="cover" />
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: theme.borderColor }]}>
              <Text style={styles.placeholderIcon}>🌴</Text>
            </View>
          )}

          <View style={styles.content}>
            {/* Header */}
            <View style={styles.headerRow}>
              <View style={[styles.categoryBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.categoryBadgeText}>{item.category}</Text>
              </View>
              <Text style={[styles.priceTag, { color: theme.primary }]}>
                {item.prix ? `${Number(item.prix).toFixed(0)} DT` : t.home.on_request}
              </Text>
            </View>

            <Text style={[styles.title, { color: theme.textMain }, isRTL && styles.rtl]}>
              {item.title || item.nom}
            </Text>

            {/* Address */}
            {(item.adresse || item.lieu) && (
              <View style={[styles.locRow, isRTL && styles.rowReverse]}>
                <Text style={styles.locIcon}>📍</Text>
                <Text style={[styles.locText, { color: theme.textMuted }]}>
                  {item.adresse || item.lieu}
                </Text>
              </View>
            )}

            {/* Google Maps button (replaces the map) */}
            <TouchableOpacity onPress={openMap} style={[styles.mapButton, { backgroundColor: 'rgba(249,115,22,0.1)', borderColor: 'rgba(249,115,22,0.3)' }]} activeOpacity={0.8}>
              <Text style={styles.mapButtonIcon}>🗺️</Text>
              <Text style={[styles.mapButtonText, { color: theme.primary }]}>{t.details.open_map}</Text>
              <Text style={[styles.mapButtonArrow, { color: theme.primary }]}>→</Text>
            </TouchableOpacity>

            {/* Description */}
            <SectionTitle title={t.details.about} theme={theme} />
            <Text style={[styles.description, { color: theme.textMuted }, isRTL && styles.rtl]}>
              {item.description || 'Aucune description fournie.'}
            </Text>

            {/* Practical Info */}
            <SectionTitle title={t.details.practical_info} theme={theme} />
            <View style={[styles.contactCard, { backgroundColor: theme.bgPage, borderColor: theme.borderColor }]}>
              <InfoRow icon="📞" label={t.details.phone}
                value={item.telephone || item.utilisateur?.telephone} theme={theme} />
              <InfoRow icon="✉️" label={t.details.contact_email}
                value={item.email || item.utilisateur?.email} theme={theme} />
              <InfoRow icon="📍" label={t.details.address}
                value={item.adresse || item.lieu || item.localisation} theme={theme} />
            </View>

            {/* Category-specific section */}
            {renderCategorySection()}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1 },
  closeButton: {
    position: 'absolute', top: 16, right: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(15,23,42,0.6)',
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  closeButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  scrollContainer: { paddingBottom: 40 },
  carousel: { height: 260 },
  carouselImage: { height: 260 },
  imagePlaceholder: { height: 260, alignItems: 'center', justifyContent: 'center' },
  placeholderIcon: { fontSize: 72 },
  content: { padding: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  categoryBadge: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 100 },
  categoryBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  priceTag: { fontSize: 20, fontWeight: '900' },
  title: { fontSize: 22, fontWeight: '900', marginBottom: 8 },
  rtl: { textAlign: 'right' },
  rowReverse: { flexDirection: 'row-reverse' },
  locRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  locIcon: { fontSize: 14, marginRight: 6 },
  locText: { fontSize: 13, fontWeight: '600', flex: 1 },
  mapButton: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 14, borderWidth: 1,
    marginBottom: 6, gap: 8,
  },
  mapButtonIcon: { fontSize: 20 },
  mapButtonText: { flex: 1, fontWeight: '700', fontSize: 14 },
  mapButtonArrow: { fontSize: 16, fontWeight: '800' },
  sectionTitle: {
    fontSize: 15, fontWeight: '800', marginTop: 20, marginBottom: 10,
    borderBottomWidth: 1.5, paddingBottom: 6,
  },
  description: { fontSize: 14, lineHeight: 22 },
  contactCard: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoIcon: { fontSize: 20, marginTop: 2 },
  infoLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  infoValue: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  amenityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  amenityChip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, gap: 5 },
  amenityIcon: { fontSize: 14 },
  amenityLabel: { fontSize: 12, fontWeight: '600' },
  formulaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  formulaLabel: { fontSize: 13, fontWeight: '600' },
  formulaPrice: { fontSize: 14, fontWeight: '800' },
  emptyNote: { fontSize: 13, fontStyle: 'italic', marginTop: 4, marginBottom: 8 },
  certBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, alignSelf: 'flex-start', marginBottom: 8 },
  certText: { fontSize: 13, fontWeight: '700' },
  statusDot: { fontSize: 13, fontWeight: '700' },
  roomCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 10,
  },
  roomImage: {
    width: 100,
    height: '100%',
  },
  roomImagePlaceholder: {
    width: 100,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomImagePlaceholderIcon: {
    fontSize: 24,
  },
  roomDetails: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  roomType: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  roomCapacity: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  roomPrice: {
    fontSize: 15,
    fontWeight: '900',
  },
  expandArrow: {
    paddingRight: 16,
    justifyContent: 'center',
    alignSelf: 'center',
    fontSize: 12,
  },
  roomExpandedContent: {
    borderTopWidth: 1,
    padding: 14,
    gap: 10,
  },
  roomDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  bedConfigRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bedConfigText: {
    fontSize: 13,
    fontWeight: '700',
  },
  roomAmenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  roomAmenityPill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  roomAmenityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  subItemCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 10,
  },
  subItemImage: {
    width: 80,
    height: '100%',
  },
  subItemPlaceholder: {
    width: 80,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subItemPlaceholderIcon: {
    fontSize: 24,
  },
  subItemDetails: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  subItemTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  subItemSub: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 1,
  },
  subItemPriceBox: {
    paddingRight: 14,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  subItemPrice: {
    fontSize: 14,
    fontWeight: '900',
  },
});
