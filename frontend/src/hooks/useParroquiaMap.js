import { useEffect, useState } from 'react';
import L from 'leaflet';

// Configurar iconos de Leaflet solo una vez
if (L.Icon?.Default) {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
  });
}

const FALLBACK_COORDS = {
  LAMBAYEQUE: { lat: -6.7063, lng: -79.9066 },
  CHICLAYO: { lat: -6.7651, lng: -79.8542 },
  'JOSE LEONARDO ORTIZ': { lat: -6.7596, lng: -79.8538 },
  default: { lat: -6.7714, lng: -79.8409 }
};

const getFallbackCoords = (distrito) => FALLBACK_COORDS[distrito?.toUpperCase?.()] || FALLBACK_COORDS.default;

export const DEFAULT_CENTER = [-6.7437, -79.8715];

export const geocodeParroquia = async (parroquia) => {
  if (!parroquia) return getFallbackCoords('default');

  const latFromDb = parseFloat(parroquia.par_latitud);
  const lngFromDb = parseFloat(parroquia.par_longitud);
  if (!Number.isNaN(latFromDb) && !Number.isNaN(lngFromDb)) {
    return { lat: latFromDb, lng: lngFromDb };
  }

  const cacheKey = `coords_${parroquia.parroquiaid}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (!Number.isNaN(parsed.lat) && !Number.isNaN(parsed.lng)) {
        return parsed;
      }
    } catch (error) {
      // Ignorar cache inválido
    }
  }

  try {
    const query = `${parroquia.par_direccion || ''}, ${parroquia.dis_nombre || ''}, Lambayeque, Perú`;
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
    const data = await response.json();
    if (Array.isArray(data) && data.length) {
      const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      if (!Number.isNaN(coords.lat) && !Number.isNaN(coords.lng)) {
        localStorage.setItem(cacheKey, JSON.stringify(coords));
        return coords;
      }
    }
  } catch (error) {
    // Ignorar errores de red/geocoding
  }

  return getFallbackCoords(parroquia.dis_nombre);
};

export const useParroquiaCoords = (parroquias = [], selectedParroquiaId = null) => {
  const [coordsMap, setCoordsMap] = useState({});
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [mapKey, setMapKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const geocodeAll = async () => {
      if (!parroquias.length) {
        setCoordsMap({});
        setMapCenter(DEFAULT_CENTER);
        setMapKey((prev) => prev + 1);
        return;
      }

      const results = await Promise.all(
        parroquias.map(async (parroquia) => ({
          parroquiaid: parroquia.parroquiaid,
          parroquia,
          coords: await geocodeParroquia(parroquia)
        }))
      );

      if (cancelled) return;

      const map = {};
      results.forEach(({ parroquiaid, parroquia, coords }) => {
        if (coords && !Number.isNaN(coords.lat) && !Number.isNaN(coords.lng)) {
          map[parroquiaid] = { parroquia, coords };
        }
      });
      setCoordsMap(map);

      const firstValid = results.find(({ coords }) => coords && !Number.isNaN(coords.lat) && !Number.isNaN(coords.lng));
      setMapCenter(firstValid ? [firstValid.coords.lat, firstValid.coords.lng] : DEFAULT_CENTER);
      setMapKey((prev) => prev + 1);
    };

    geocodeAll();
    return () => { cancelled = true; };
  }, [parroquias]);

  useEffect(() => {
    if (!selectedParroquiaId) return;
    const entry = coordsMap[selectedParroquiaId];
    if (entry?.coords) {
      setMapCenter([entry.coords.lat, entry.coords.lng]);
      setMapKey((prev) => prev + 1);
    }
  }, [selectedParroquiaId, coordsMap]);

  return { coordsMap, mapCenter, mapKey };
};

export const createParroquiaMarkerIcon = (label = '⛪') =>
  L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: #3b82f6;
      color: white;
      border-radius: 50%;
      width: 35px;
      height: 35px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 16px;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    ">${label}</div>`,
    iconSize: [35, 35],
    iconAnchor: [17.5, 35],
    popupAnchor: [0, -35]
  });
