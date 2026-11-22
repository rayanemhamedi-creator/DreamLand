import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Re-centers the map whenever the position changes (MapContainer center is not reactive)
const MapCenterUpdater = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], map.getZoom());
    }
  }, [lat, lng, map]);
  return null;
};

const ProviderMapDisplay = ({ localisation, providerName }) => {
  if (!localisation || !localisation.includes(',')) {
    return (
      <div className="bg-light rounded-4 d-flex align-items-center justify-content-center text-muted" style={{ height: '300px' }}>
        <div className="text-center">
          <i className="bi bi-geo-alt fs-1 opacity-25"></i>
          <p className="fw-700 mt-2">Localisation non définie</p>
        </div>
      </div>
    );
  }

  const parts = localisation.split(',');
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);

  if (isNaN(lat) || isNaN(lng)) {
    return (
      <div className="bg-light rounded-4 d-flex align-items-center justify-content-center text-muted" style={{ height: '300px' }}>
        <div className="text-center">
          <i className="bi bi-exclamation-triangle fs-1 opacity-25 text-warning"></i>
          <p className="fw-700 mt-2">Coordonnées invalides</p>
        </div>
      </div>
    );
  }

  return (
    <div className="provider-map-container rounded-4 overflow-hidden border shadow-sm" style={{ height: '400px', width: '100%' }}>
      <MapContainer
        key={`${lat},${lng}`}
        center={[lat, lng]}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapCenterUpdater lat={lat} lng={lng} />
        <Marker position={[lat, lng]}>
          <Popup>
            <div className="fw-800 text-primary">{providerName}</div>
          </Popup>
        </Marker>
      </MapContainer>
      
      {/* Google Maps link for directions */}
      <div className="p-3 bg-white border-top d-flex justify-content-between align-items-center">
        <span className="small text-muted fw-600"><i className="bi bi-info-circle me-1"></i> Cliquez sur le marqueur pour voir le nom</span>
        <a 
          href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn btn-sm btn-outline-primary rounded-pill fw-700 px-3"
        >
          <i className="bi bi-signpost-2 me-1"></i> Itinéraire
        </a>
      </div>
    </div>
  );
};

export default ProviderMapDisplay;
