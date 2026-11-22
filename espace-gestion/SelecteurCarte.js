import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Nominatim Geocoding function
const searchAddress = async (query) => {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ", Djerba, Tunisia")}&limit=5&accept-language=fr`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  if (response.status === 429) throw new Error("Trop de requêtes. Veuillez attendre une seconde.");
  if (!response.ok) throw new Error("Erreur service de recherche");
  return await response.json();
};

// Fix for default marker icon in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LocationMarker = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });
  return position === null ? null : <Marker position={position}></Marker>;
};

const MapPicker = ({ initialValue, onChange, onAddressChange }) => {
  const [position, setPosition] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [shouldCenter, setShouldCenter] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  // Use refs to hold stable callback references — prevents infinite re-render loops
  // caused by new arrow function instances on every parent render
  const onChangeRef = useRef(onChange);
  const onAddressChangeRef = useRef(onAddressChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onAddressChangeRef.current = onAddressChange; }, [onAddressChange]);

  // Flag to avoid setting the default position more than once
  const defaultSetRef = useRef(false);

  // Sync internal position from initialValue whenever it changes externally
  useEffect(() => {
    if (initialValue && initialValue.includes(',')) {
      const [lat, lng] = initialValue.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) {
        setPosition(prev => {
          // Normalize both sides to 6 decimal places to avoid micro-jumps
          // caused by Leaflet's full-precision LatLng vs our rounded stored string
          const prevLatR = prev ? parseFloat(prev.lat.toFixed(6)) : null;
          const prevLngR = prev ? parseFloat(prev.lng.toFixed(6)) : null;
          const newLatR  = parseFloat(lat.toFixed(6));
          const newLngR  = parseFloat(lng.toFixed(6));
          if (!prev || prevLatR !== newLatR || prevLngR !== newLngR) {
            return { lat: newLatR, lng: newLngR };
          }
          return prev;
        });
      }
    }
  }, [initialValue]);

  // Set default center (Djerba) ONCE when no initialValue is provided
  useEffect(() => {
    if (!initialValue && !defaultSetRef.current) {
      defaultSetRef.current = true;
      const defaultPos = { lat: 33.8075, lng: 10.8451 };
      setPosition(defaultPos);
      if (onChangeRef.current) {
        onChangeRef.current(`${defaultPos.lat.toFixed(6)}, ${defaultPos.lng.toFixed(6)}`);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePositionChange = async (pos) => {
    // Normalize to 6 decimal places immediately so internal state
    // always matches the string we store — prevents the sync effect
    // from detecting a false change and shifting the marker
    const roundedPos = {
      lat: parseFloat(pos.lat.toFixed(6)),
      lng: parseFloat(pos.lng.toFixed(6))
    };
    setPosition(roundedPos);
    if (onChangeRef.current) {
      onChangeRef.current(`${roundedPos.lat.toFixed(6)}, ${roundedPos.lng.toFixed(6)}`);
    }
    // Reverse geocode to get address string
    if (onAddressChangeRef.current) {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${roundedPos.lat}&lon=${roundedPos.lng}&accept-language=fr`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data && data.display_name) {
            onAddressChangeRef.current(data.display_name);
          }
        }
      } catch (err) {
        console.error("Reverse geocoding failed:", err);
      }
    }
  };

  const onSearch = async (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    try {
      const results = await searchAddress(searchQuery);
      if (results && results.length > 0) {
        setSearchResults(results);
        selectResult(results[0], false);
      } else {
        alert("📍 Adresse non trouvée sur Djerba. Essayez d'être plus spécifique.");
      }
    } catch (err) {
      console.error("Search failed:", err);
      if (err.message.includes("Failed to fetch")) {
        alert("📡 Erreur de connexion : Vérifiez votre connexion internet.");
      } else {
        alert("⚠️ Erreur : " + (err.message || "Le service de recherche est temporairement indisponible."));
      }
    } finally {
      setIsSearching(false);
    }
  };

  const selectResult = (result, hideDropdown = true) => {
    const { lat, lon } = result;
    const newPos = { lat: parseFloat(lat), lng: parseFloat(lon) };
    setPosition(newPos);
    setShouldCenter(true);
    if (onChangeRef.current) {
      onChangeRef.current(`${newPos.lat.toFixed(6)}, ${newPos.lng.toFixed(6)}`);
    }
    if (onAddressChangeRef.current) {
      onAddressChangeRef.current(result.display_name);
    }
    if (hideDropdown) {
      setSearchResults([]);
      setSearchQuery(result.display_name.split(',')[0]);
    }
  };

  return (
    <div className="map-picker-wrapper d-flex flex-column gap-2">
      <div className="input-group mb-2">
        <input
          type="text"
          className="form-control form-control-sm border-end-0 rounded-start-pill px-3"
          placeholder="Rechercher une adresse (ex: Houmt Souk)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); onSearch(e); }
          }}
        />
        <button
          className="btn btn-sm btn-primary rounded-end-pill px-3"
          type="button"
          onClick={onSearch}
          disabled={isSearching}
        >
          {isSearching ? <span className="spinner-border spinner-border-sm"></span> : <i className="bi bi-search"></i>}
        </button>
      </div>

      {searchResults.length > 0 && (
        <div className="search-results-dropdown shadow border rounded-4 bg-white p-2 mb-2" style={{ position: 'relative', zIndex: 1000, maxWidth: '100%' }}>
          <div className="small text-muted mb-2 px-2 fw-600 border-bottom pb-1">Résultats trouvés (cliquez pour choisir) :</div>
          {searchResults.map((res, index) => (
            <div
              key={index}
              className="p-2 result-item hover-bg-light cursor-pointer rounded-3 small fw-700 text-dark d-flex align-items-center"
              onClick={() => selectResult(res)}
              style={{ cursor: 'pointer' }}
            >
              <i className="bi bi-geo-alt-fill text-danger me-2"></i>
              {res.display_name}
            </div>
          ))}
        </div>
      )}

      <div className="map-picker-container rounded-4 overflow-hidden border shadow-sm" style={{ height: '300px', width: '100%' }}>
        <MapContainer
          center={position || [33.8075, 10.8451]}
          zoom={11}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} setPosition={(pos) => {
            handlePositionChange(pos);
            setShouldCenter(false);
          }} />
          <MapCenterUpdater position={position} shouldCenter={shouldCenter} setShouldCenter={setShouldCenter} />
        </MapContainer>
      </div>
    </div>
  );
};

// Helper to center map when position changes via search
const MapCenterUpdater = ({ position, shouldCenter, setShouldCenter }) => {
  const map = useMapEvents({});
  useEffect(() => {
    if (position && shouldCenter) {
      map.setView(position, 15);
      setShouldCenter(false);
    }
  }, [position, map, shouldCenter, setShouldCenter]);
  return null;
};

export default MapPicker;
