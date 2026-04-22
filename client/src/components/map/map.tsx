import "leaflet/dist/leaflet.css";
import L, { type GeoJSON, type Map as LeafletMap } from "leaflet";
import type { FC } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FaLocationArrow, FaLocationCrosshairs, FaXmark } from "react-icons/fa6";
import AppLayout from "@/components/app-layout/app-layout";

type ParkingLot = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  available_spots: number;
  total_spots: number;
  price_per_hour: number;
};

const MAP_CENTER: [number, number] = [34.702485, 135.495951];

const LOTS: ParkingLot[] = [
  {
    id: 1,
    name: "北浜サイクルポート",
    latitude: 34.69392,
    longitude: 135.5016,
    available_spots: 12,
    total_spots: 30,
    price_per_hour: 120,
  },
  {
    id: 2,
    name: "本町サイクルデッキ",
    latitude: 34.68462,
    longitude: 135.50213,
    available_spots: 3,
    total_spots: 28,
    price_per_hour: 150,
  },
  {
    id: 3,
    name: "梅田ステーション東",
    latitude: 34.70631,
    longitude: 135.49887,
    available_spots: 18,
    total_spots: 40,
    price_per_hour: 100,
  },
];

const MapComponent: FC = () => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const routeLayerRef = useRef<GeoJSON | null>(null);
  const [currentLatLng, setCurrentLatLng] = useState<[number, number]>(MAP_CENTER);
  const [selectedLotId, setSelectedLotId] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mapMessage, setMapMessage] = useState("地図を読み込み中...");
  const selectedLot = selectedLotId ? LOTS.find((lot) => lot.id === selectedLotId) : null;

  const getStatusClass = useCallback(
    (available: number, total: number): "free" | "few" | "full" => {
      if (available === 0) {
        return "full";
      }
      if (available <= total * 0.2) {
        return "few";
      }
      return "free";
    },
    []
  );

  useEffect(() => {
    const mapContainer = mapContainerRef.current;
    if (!mapContainer || mapRef.current) {
      return;
    }

    const map = L.map(mapContainer, { zoomControl: false }).setView(MAP_CENTER, 15);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    userMarkerRef.current = L.circleMarker(MAP_CENTER, {
      color: "#4F46E5",
      fillColor: "#4F46E5",
      fillOpacity: 0.85,
      radius: 8,
      weight: 2,
    })
      .addTo(map)
      .bindPopup("現在地");

    LOTS.forEach((lot) => {
      const status = getStatusClass(lot.available_spots, lot.total_spots);
      const title = status === "full" ? "満" : lot.available_spots;
      const icon = L.divIcon({
        className: "custom-icon",
        html: `<div class="custom-pin pin-${status}">
          <span class="pin-bike">P</span>
          <span>${title}</span>
        </div>`,
        iconSize: [44, 44],
        iconAnchor: [22, 44],
      });
      const marker = L.marker([lot.latitude, lot.longitude], { icon }).addTo(map);
      marker.on("click", () => {
        setSelectedLotId(lot.id);
        setPanelOpen(true);
        map.panTo([lot.latitude, lot.longitude]);
      });
    });

    setMapMessage("駐輪場を選択してください");

    const resizeMap = () => {
      map.invalidateSize();
    };
    const resizeTimer = window.setTimeout(resizeMap, 120);
    window.addEventListener("resize", resizeMap);

    return () => {
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", resizeMap);
      map.remove();
      mapRef.current = null;
      userMarkerRef.current = null;
      routeLayerRef.current = null;
    };
  }, [getStatusClass]);

  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      setMapMessage("このブラウザは位置情報に対応していません");
      return;
    }
    setIsLocating(true);
    setMapMessage("現在地を取得中...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLatLng: [number, number] = [position.coords.latitude, position.coords.longitude];
        setCurrentLatLng(nextLatLng);
        userMarkerRef.current?.setLatLng(nextLatLng);
        mapRef.current?.flyTo(nextLatLng, 16);
        setMapMessage("現在地を取得しました");
        setIsLocating(false);
      },
      () => {
        setCurrentLatLng(MAP_CENTER);
        userMarkerRef.current?.setLatLng(MAP_CENTER);
        mapRef.current?.flyTo(MAP_CENTER, 15);
        setMapMessage("現在地が取得できないため大阪駅を表示しています");
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
      }
    );
  };

  const handleRoute = async () => {
    if (!selectedLot || !panelOpen) {
      return;
    }
    const map = mapRef.current;
    if (!map) {
      return;
    }

    setIsRouting(true);
    setMapMessage("OSRM でルートを計算しています...");

    try {
      if (routeLayerRef.current) {
        map.removeLayer(routeLayerRef.current);
        routeLayerRef.current = null;
      }

      const url = `https://router.project-osrm.org/route/v1/bicycle/${currentLatLng[1]},${currentLatLng[0]};${selectedLot.longitude},${selectedLot.latitude}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("route request failed");
      }
      const data = (await response.json()) as {
        routes?: Array<{ duration: number; geometry: GeoJSON.GeoJsonObject }>;
      };
      const route = data.routes?.[0];
      if (!route) {
        throw new Error("route not found");
      }

      routeLayerRef.current = L.geoJSON(route.geometry, {
        style: { color: "#4F46E5", weight: 5, opacity: 0.9 },
      }).addTo(map);
      map.fitBounds(routeLayerRef.current.getBounds(), { padding: [40, 40] });
      setMapMessage(`自転車で約 ${Math.ceil(route.duration / 60)} 分のルートです。`);
    } catch {
      setMapMessage("Google Mapsでルートを開きます。");
      window.open(
        `https://www.google.com/maps/dir/?api=1&origin=${currentLatLng[0]},${currentLatLng[1]}&destination=${selectedLot.latitude},${selectedLot.longitude}&travelmode=bicycling`,
        "_blank",
        "noopener,noreferrer"
      );
    } finally {
      setIsRouting(false);
    }
  };

  const handleClosePanel = () => {
    setPanelOpen(false);
    setSelectedLotId(null);
    if (routeLayerRef.current && mapRef.current) {
      mapRef.current.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }
  };

  const statusClass = selectedLot
    ? getStatusClass(selectedLot.available_spots, selectedLot.total_spots)
    : "free";
  const statusLabel =
    statusClass === "full" ? "満車" : statusClass === "few" ? "残りわずか" : "空きあり";

  return (
    <AppLayout
      hideHeader
      mainClassName="map-main"
      subtitle="地図から近くの駐輪場を探せます"
      title="マップ検索"
    >
      <div className="map-layout">
        <div id="map" ref={mapContainerRef} />

        <button
          className="locate-btn"
          disabled={isLocating}
          onClick={handleLocateUser}
          title="現在地を取得"
          type="button"
        >
          {isLocating ? "..." : <FaLocationCrosshairs />}
        </button>

        <div className={`floating-panel${panelOpen ? "" : " hidden"}`} id="detail-panel">
          <button className="panel-close-btn" onClick={handleClosePanel} type="button">
            <FaXmark />
          </button>

          <div className="panel-header">
            <h2 id="lot-title">{selectedLot?.name ?? "駐輪場名"}</h2>
            <span className={`badge ${statusClass}`} id="lot-status-badge">
              {statusLabel}
            </span>
          </div>

          <div className="panel-body">
            <div className="stat-row">
              <div className="stat">
                <span className="label">空き台数</span>
                <span className="val">
                  <strong className="highlight" id="lot-available">
                    {selectedLot?.available_spots ?? 0}
                  </strong>{" "}
                  / <span id="lot-total">{selectedLot?.total_spots ?? 0}</span>
                </span>
              </div>
              <div className="stat">
                <span className="label">料金</span>
                <span className="val">
                  ¥<strong id="lot-price">{selectedLot?.price_per_hour ?? 0}</strong>/h
                </span>
              </div>
            </div>
            <p className="map-message">{mapMessage}</p>
          </div>

          <div className="panel-actions">
            <button
              className="secondary-btn"
              disabled={isRouting}
              onClick={handleRoute}
              type="button"
            >
              <FaLocationArrow /> ルート
            </button>
            <button className="primary-btn" disabled type="button">
              予約する
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default MapComponent;
