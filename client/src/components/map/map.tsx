import { useNavigate } from "@tanstack/react-router";
import { AdvancedMarker, APIProvider, Map as GoogleMap, useMap } from "@vis.gl/react-google-maps";
import type { FC } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FaBars,
  FaBell,
  FaBicycle,
  FaCalendarCheck,
  FaChevronLeft,
  FaCircleCheck,
  FaLocationArrow,
  FaLocationDot,
  FaMagnifyingGlass,
  FaMap,
  FaStar,
  FaXmark,
} from "react-icons/fa6";
import { fetchParkingLots } from "@/api/parking-lots";
import { createReservation } from "@/api/reservations";
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_MAP_ID } from "@/config/env";
import { isDevUser } from "@/lib/adminRole";
import { EV3_TOTAL_SLOTS } from "@/lib/ev3Parking";
import { FloorPlanModal } from "../floorPlan/FloorPlanModal";
import { CurrentLocationMarker } from "./CurrentLocationMarker";
import { useDirectionsRoute } from "./hooks/useDirectionsRoute";
import { useInAppNavigation } from "./hooks/useInAppNavigation";
import { useNavMapFollow } from "./hooks/useNavMapFollow";
import MapSideDrawer from "./MapSideDrawer";
import { NavigationPanel } from "./NavigationPanel";
import { NavRecenterButton } from "./NavRecenterButton";
import { RouteMapLayer } from "./RouteMapLayer";
import { RouteOriginDestinationBar } from "./RouteOriginDestinationBar";
import { RoutePreviewPanel } from "./RoutePreviewPanel";
import {
  computeBearing,
  haversineMeters,
  isValidGeoHeading,
  type RouteCandidate,
  type RouteViewMode,
} from "./types/route";

const MAP_CENTER = { lat: 34.702485, lng: 135.495951 };

type ParkingLot = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  available_spots: number;
  total_spots: number;
  price_per_hour: number;
  availability_source_type?: string;
  isEv3Linked?: boolean;
};

type LotStatusClass = "free" | "few" | "full";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const toApiDateTime = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const INITIAL_LOTS: ParkingLot[] = [
  {
    id: "static-umeda-station-east",
    name: "梅田ステーション東",
    latitude: 34.70631,
    longitude: 135.49887,
    available_spots: EV3_TOTAL_SLOTS,
    total_spots: EV3_TOTAL_SLOTS,
    price_per_hour: 100,
    availability_source_type: "touch_sensor",
    isEv3Linked: true,
  },
  {
    id: "static-honmachi-cycle-deck",
    name: "本町サイクルデッキ",
    latitude: 34.68462,
    longitude: 135.50213,
    available_spots: 3,
    total_spots: 28,
    price_per_hour: 150,
  },
  {
    id: "static-kitahama-cycle-port",
    name: "北浜サイクルポート",
    latitude: 34.69392,
    longitude: 135.5016,
    available_spots: 12,
    total_spots: 30,
    price_per_hour: 120,
  },
];

const lotStatusClass = (
  available: number,
  total: number,
  isEv3Linked?: boolean
): LotStatusClass => {
  if (isEv3Linked) {
    if (available <= 0) return "full";
    if (available === 1) return "few";
    return "free";
  }
  if (available === 0) return "full";
  if (available <= total * 0.2) return "few";
  return "free";
};

const NOTIFICATIONS = [
  {
    id: 1,
    title: "予約完了",
    text: "北浜サイクルポートの予約が完了しました。",
    date: "5分前",
    unread: true,
  },
  {
    id: 2,
    title: "空き情報更新",
    text: "本町サイクルデッキに空きが出ました（3台）",
    date: "20分前",
    unread: true,
  },
  {
    id: 3,
    title: "利用完了",
    text: "梅田ステーション東の利用が完了しました。",
    date: "昨日",
    unread: false,
  },
];

type MapInnerProps = {
  lots: ParkingLot[];
  currentLatLng: [number, number];
  heading: number | null;
  onSelectLot: (id: string) => void;
  onMapReady: (map: google.maps.Map) => void;
  showRouteLayer: boolean;
  autoFitRouteBounds: boolean;
  routeCandidates: RouteCandidate[];
  selectedRouteIndex: number;
  onSelectRoute: (index: number) => void;
};

const MapInner: FC<MapInnerProps> = ({
  lots,
  currentLatLng,
  heading,
  onSelectLot,
  onMapReady,
  showRouteLayer,
  autoFitRouteBounds,
  routeCandidates,
  selectedRouteIndex,
  onSelectRoute,
}) => {
  const map = useMap();

  useEffect(() => {
    if (map) onMapReady(map);
  }, [map, onMapReady]);

  return (
    <>
      <CurrentLocationMarker position={currentLatLng} heading={heading} />

      {lots.map((lot) => {
        const status = lotStatusClass(lot.available_spots, lot.total_spots, lot.isEv3Linked);
        const title = status === "full" ? "満" : String(lot.available_spots);
        const pinColor = status === "full" ? "#ef4444" : status === "few" ? "#f59e0b" : "#10b981";
        return (
          <AdvancedMarker
            key={lot.id}
            position={{ lat: lot.latitude, lng: lot.longitude }}
            title={lot.name}
            onClick={() => onSelectLot(lot.id)}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: "3px solid #fff",
                boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                color: "#fff",
                fontWeight: 800,
                fontSize: "0.85rem",
                background: pinColor,
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: "0.7rem", marginBottom: 2 }}>P</span>
              <span>{title}</span>
            </div>
          </AdvancedMarker>
        );
      })}

      {showRouteLayer && routeCandidates.length > 0 && (
        <RouteMapLayer
          candidates={routeCandidates}
          selectedRouteIndex={selectedRouteIndex}
          showTimeBubbles={routeCandidates.length > 1}
          onSelectRoute={onSelectRoute}
          autoFitBounds={autoFitRouteBounds}
        />
      )}
    </>
  );
};

const MapComponent: FC = () => {
  const navigate = useNavigate();
  const mapRef = useRef<google.maps.Map | null>(null);

  const [lots, setLots] = useState<ParkingLot[]>(INITIAL_LOTS);
  const [currentLatLng, setCurrentLatLng] = useState<[number, number]>([
    MAP_CENTER.lat,
    MAP_CENTER.lng,
  ]);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [routeViewMode, setRouteViewMode] = useState<RouteViewMode>("idle");
  const [panelOpen, setPanelOpen] = useState(false);
  const [mapMessage, setMapMessage] = useState("駐輪場を選択してください");
  const prevGeoPositionRef = useRef<[number, number] | null>(null);
  const [currentHeading, setCurrentHeading] = useState<number | null>(null);

  const {
    isLoading: isRouteLoading,
    error: routeError,
    activeTravelMode,
    selectedRouteIndex,
    modeDurations,
    activeCandidates,
    selectedCandidate,
    setSelectedRouteIndex,
    fetchAllModes,
    switchTravelMode,
    resetRoutes,
  } = useDirectionsRoute();

  const isNavigating = routeViewMode === "navigating";
  const navigation = useInAppNavigation({
    route: selectedCandidate?.route ?? null,
    currentLatLng,
    isNavigating,
  });

  const navigationHeading = useMemo(() => {
    if (currentHeading !== null) return currentHeading;
    const step = navigation.currentStep;
    if (!step?.end_location) return null;
    return computeBearing(
      { lat: currentLatLng[0], lng: currentLatLng[1] },
      { lat: step.end_location.lat(), lng: step.end_location.lng() }
    );
  }, [currentHeading, currentLatLng, navigation.currentStep]);

  const displayHeading = useMemo(() => {
    if (currentHeading !== null) return currentHeading;
    if (routeViewMode === "navigating") return navigationHeading;
    if (routeViewMode === "preview" && selectedCandidate) {
      const path = selectedCandidate.path;
      if (path.length >= 2) {
        const from = { lat: currentLatLng[0], lng: currentLatLng[1] };
        let nearestIdx = 0;
        let nearestDist = Number.POSITIVE_INFINITY;
        for (let i = 0; i < path.length; i++) {
          const d = haversineMeters(from, path[i]);
          if (d < nearestDist) {
            nearestDist = d;
            nearestIdx = i;
          }
        }
        const nextIdx = Math.min(nearestIdx + 1, path.length - 1);
        if (nextIdx !== nearestIdx) {
          return computeBearing(from, path[nextIdx]);
        }
        return computeBearing(path[nearestIdx], path[nextIdx]);
      }
    }
    return null;
  }, [currentHeading, navigationHeading, routeViewMode, selectedCandidate, currentLatLng]);

  const navMapFollow = useNavMapFollow({
    mapRef,
    currentLatLng,
    routeViewMode,
    heading: displayHeading,
  });

  const watchIdRef = useRef<number | null>(null);
  const hasCenteredOnUserRef = useRef(false);
  const latestUserPositionRef = useRef<[number, number] | null>(null);

  const centerMapOnUser = useCallback((ll: [number, number]) => {
    if (hasCenteredOnUserRef.current || !mapRef.current) return;
    mapRef.current.panTo({ lat: ll[0], lng: ll[1] });
    mapRef.current.setZoom(16);
    hasCenteredOnUserRef.current = true;
  }, []);

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [showFloorPlan, setShowFloorPlan] = useState(false);
  const [reserveHours, setReserveHours] = useState(1);
  const [reserveSuccess, setReserveSuccess] = useState(false);
  const [isReserving, setIsReserving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [favoriteLotIds, setFavoriteLotIds] = useState<string[]>(() => {
    const saved = localStorage.getItem("my-lots");
    return saved ? JSON.parse(saved) : [];
  });
  const [showFavorites, setShowFavorites] = useState(false);

  const toggleFavorite = useCallback((id: string) => {
    setFavoriteLotIds((prev) => {
      const newFavs = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem("my-lots", JSON.stringify(newFavs));
      return newFavs;
    });
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;
  const selectedLot = selectedLotId ? lots.find((l) => l.id === selectedLotId) : null;

  const getStatusClass = useCallback(
    (available: number, total: number, isEv3Linked?: boolean): LotStatusClass =>
      lotStatusClass(available, total, isEv3Linked),
    []
  );

  const handleMapReady = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      if (latestUserPositionRef.current) {
        centerMapOnUser(latestUserPositionRef.current);
      }
    },
    [centerMapOnUser]
  );

  const handleSelectLot = useCallback(
    (id: string) => {
      const lot = lots.find((l) => l.id === id);
      setSelectedLotId(id);
      setPanelOpen(true);
      setShowSearch(false);
      if (lot) {
        mapRef.current?.panTo({ lat: lot.latitude, lng: lot.longitude });
      }
    },
    [lots]
  );

  useEffect(() => {
    let cancelled = false;

    const loadParkingLots = async () => {
      try {
        const data = await fetchParkingLots();
        if (cancelled || data.length === 0) return;
        setLots(
          data.map((lot) => ({
            id: lot.id,
            name: lot.name,
            latitude: lot.latitude,
            longitude: lot.longitude,
            available_spots: lot.available_spots,
            total_spots: lot.total_spots,
            price_per_hour: lot.price_per_hour,
            availability_source_type: lot.availability_source_type,
            isEv3Linked: lot.availability_source_type === "touch_sensor",
          }))
        );
      } catch {
        // バックエンド未起動時は INITIAL_LOTS の表示を維持
      }
    };

    void loadParkingLots();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      try {
        const data = await fetchParkingLots();
        if (cancelled) return;
        setLots((prev) => {
          const newLots = [...prev];
          for (const fetched of data) {
            const idx = newLots.findIndex((l) => l.id === fetched.id);
            if (idx >= 0) {
              newLots[idx] = {
                ...newLots[idx],
                available_spots: fetched.available_spots,
                total_spots: fetched.total_spots,
                availability_source_type: fetched.availability_source_type,
                isEv3Linked: fetched.availability_source_type === "touch_sensor",
              };
            } else {
              newLots.push({
                id: fetched.id,
                name: fetched.name,
                latitude: fetched.latitude,
                longitude: fetched.longitude,
                available_spots: fetched.available_spots,
                total_spots: fetched.total_spots,
                price_per_hour: fetched.price_per_hour,
                availability_source_type: fetched.availability_source_type,
                isEv3Linked: fetched.availability_source_type === "touch_sensor",
              });
            }
          }
          return newLots;
        });
      } catch {
        // バックエンド未起動時は INITIAL_LOTS の表示を維持
      }
    };

    void tick();
    const timer = window.setInterval(() => void tick(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setMapMessage("このブラウザは位置情報に対応していません");
      return;
    }

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    const handlePosition = (pos: GeolocationPosition) => {
      const ll: [number, number] = [pos.coords.latitude, pos.coords.longitude];
      latestUserPositionRef.current = ll;

      if (isValidGeoHeading(pos.coords.heading)) {
        setCurrentHeading(pos.coords.heading);
      } else if (prevGeoPositionRef.current) {
        const prev = prevGeoPositionRef.current;
        const moved = haversineMeters({ lat: prev[0], lng: prev[1] }, { lat: ll[0], lng: ll[1] });
        if (moved > 5) {
          setCurrentHeading(
            computeBearing({ lat: prev[0], lng: prev[1] }, { lat: ll[0], lng: ll[1] })
          );
        }
      }
      prevGeoPositionRef.current = ll;

      setCurrentLatLng(ll);
      centerMapOnUser(ll);
    };

    const handleError = () => {
      setMapMessage("位置情報を取得できませんでした");
    };

    navigator.geolocation.getCurrentPosition(handlePosition, handleError, geoOptions);
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      geoOptions
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [centerMapOnUser]);

  const handleRoute = async () => {
    if (!selectedLot || !panelOpen) return;

    const origin = { lat: currentLatLng[0], lng: currentLatLng[1] };
    const destination = { lat: selectedLot.latitude, lng: selectedLot.longitude };
    const ok = await fetchAllModes(origin, destination);
    if (!ok) return;

    setPanelOpen(false);
    setRouteViewMode("preview");
  };

  const { resetNavigation } = navigation;

  const handleCloseRoute = useCallback(() => {
    resetRoutes();
    setRouteViewMode("idle");
    resetNavigation();
  }, [resetNavigation, resetRoutes]);

  const handleBackToDetail = useCallback(() => {
    resetRoutes();
    setRouteViewMode("idle");
    resetNavigation();
    setPanelOpen(true);
  }, [resetNavigation, resetRoutes]);

  const handleStartNavigation = useCallback(() => {
    if (!selectedCandidate) return;
    setRouteViewMode("navigating");
    resetNavigation();
    navMapFollow.startFollowing();
  }, [navMapFollow, resetNavigation, selectedCandidate]);

  const handleEndNavigation = useCallback(() => {
    resetNavigation();
    setRouteViewMode("preview");
  }, [resetNavigation]);

  const handleSelectTravelMode = useCallback(
    (mode: typeof activeTravelMode) => {
      if (!selectedLot) return;
      void switchTravelMode(
        mode,
        { lat: currentLatLng[0], lng: currentLatLng[1] },
        { lat: selectedLot.latitude, lng: selectedLot.longitude }
      );
    },
    [currentLatLng, selectedLot, switchTravelMode]
  );

  const handleClosePanel = () => {
    setPanelOpen(false);
    setSelectedLotId(null);
    setReserveSuccess(false);
    handleCloseRoute();
  };

  const handleReserve = async () => {
    if (!selectedLot) return;
    if (!UUID_PATTERN.test(selectedLot.id)) {
      setMapMessage("予約にはバックエンドの駐輪場情報が必要です。時間をおいて再度お試しください。");
      setShowReserveModal(false);
      return;
    }

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + reserveHours * 60 * 60 * 1000);

    setIsReserving(true);
    setMapMessage("予約を作成しています...");
    try {
      await createReservation({
        parking_lot_id: selectedLot.id,
        start_time: toApiDateTime(startTime),
        end_time: toApiDateTime(endTime),
      });
      setReserveSuccess(true);
      setShowReserveModal(false);
      setMapMessage(`${selectedLot.name}の予約が完了しました！`);
      setLots((prev) =>
        prev.map((lot) =>
          lot.id === selectedLot.id
            ? { ...lot, available_spots: Math.max(lot.available_spots - 1, 0) }
            : lot
        )
      );
      setNotifications((prev) => [
        {
          id: Date.now(),
          title: "予約完了",
          text: `${selectedLot.name}の予約が完了しました。`,
          date: "今",
          unread: true,
        },
        ...prev,
      ]);
    } catch {
      setMapMessage("予約に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setIsReserving(false);
    }
  };

  const filteredLots = searchQuery.trim()
    ? lots.filter(
        (l) =>
          l.name.includes(searchQuery) ||
          getStatusClass(l.available_spots, l.total_spots, l.isEv3Linked) === searchQuery
      )
    : lots;

  const statusClass = selectedLot
    ? getStatusClass(selectedLot.available_spots, selectedLot.total_spots, selectedLot.isEv3Linked)
    : "free";
  const statusLabel =
    statusClass === "full" ? "満車" : statusClass === "few" ? "残りわずか" : "空きあり";

  const showRouteLayer = routeViewMode === "preview" || routeViewMode === "navigating";
  const showBottomPanel = routeViewMode === "idle";

  return (
    <div id="app-layout" className="full-map-screen">
      <div id="map">
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
          <GoogleMap
            style={{ width: "100%", height: "100%" }}
            defaultCenter={MAP_CENTER}
            defaultZoom={15}
            gestureHandling="greedy"
            disableDefaultUI
            mapId={GOOGLE_MAPS_MAP_ID}
          >
            <MapInner
              lots={lots}
              currentLatLng={currentLatLng}
              heading={displayHeading}
              onSelectLot={handleSelectLot}
              onMapReady={handleMapReady}
              showRouteLayer={showRouteLayer}
              autoFitRouteBounds={routeViewMode === "preview"}
              routeCandidates={activeCandidates}
              selectedRouteIndex={selectedRouteIndex}
              onSelectRoute={setSelectedRouteIndex}
            />
          </GoogleMap>
        </APIProvider>
      </div>

      {routeViewMode === "preview" && selectedLot && (
        <RouteOriginDestinationBar destinationName={selectedLot.name} onClose={handleCloseRoute} />
      )}

      {/* ===== トップバー ===== */}
      <div className="app-top-bar">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            className="top-action-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="メニューを開く"
            style={{ width: "42px", height: "42px" }}
          >
            <FaBars />
          </button>
          <div className="app-logo-small">
            <FaBicycle style={{ fontSize: "1.4rem" }} />
            <span>SmartCycle</span>
          </div>
        </div>
        <div className="app-top-actions">
          <button
            type="button"
            className="top-action-btn notif-bell-btn"
            id="notif-btn"
            onClick={() => {
              setShowNotif(!showNotif);
              setShowSearch(false);
              setShowFavorites(false);
            }}
          >
            <FaBell />
            {unreadCount > 0 && (
              <span className="notif-badge" id="notif-badge">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ===== 通知パネル ===== */}
      {showNotif && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          style={{ alignItems: "flex-start", paddingTop: "70px", zIndex: 1800 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowNotif(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowNotif(false);
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              borderRadius: "20px",
              width: "calc(100% - 32px)",
              maxWidth: "400px",
              margin: "0 auto",
              overflow: "hidden",
              boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <strong style={{ fontSize: "1rem" }}>通知</strong>
              <button
                type="button"
                onClick={() => {
                  setNotifications((n) => n.map((x) => ({ ...x, unread: false })));
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--primary)",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                すべて既読にする
              </button>
            </div>
            <div className="notice-list">
              {notifications.map((n) => (
                <div key={n.id} className={`notice-card ${n.unread ? "unread" : ""}`}>
                  <div className="notice-icon">
                    {n.unread ? <FaCircleCheck style={{ color: "var(--primary)" }} /> : <FaBell />}
                  </div>
                  <button
                    type="button"
                    className="notice-body"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                      padding: 0,
                    }}
                    onClick={() =>
                      setNotifications((prev) =>
                        prev.map((x) => (x.id === n.id ? { ...x, unread: false } : x))
                      )
                    }
                  >
                    <div className="notice-title">{n.title}</div>
                    <div className="notice-text">{n.text}</div>
                    <div className="notice-date">{n.date}</div>
                  </button>
                  <button
                    type="button"
                    className="notice-delete-btn"
                    onClick={() => setNotifications((prev) => prev.filter((x) => x.id !== n.id))}
                  >
                    <FaXmark />
                  </button>
                </div>
              ))}
              {notifications.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "32px",
                    color: "var(--text2)",
                    fontSize: "0.9rem",
                  }}
                >
                  通知はありません
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== 目的地検索パネル ===== */}
      {showSearch && (
        <div className="destination-search-panel">
          <div className="dest-panel-header">
            <button
              type="button"
              className="back-btn"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery("");
              }}
            >
              <FaChevronLeft />
            </button>
            <div className="dest-search-bar">
              <FaMagnifyingGlass style={{ color: "#94a3b8" }} />
              <input
                type="text"
                placeholder="駐輪場を検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#94a3b8",
                  }}
                >
                  <FaXmark />
                </button>
              )}
            </div>
          </div>
          <div className="dest-filter-row">
            {["", "free", "few", "full"].map((f) => (
              <button
                type="button"
                key={f}
                className={`filter-tab ${searchQuery === f ? "active" : ""}`}
                onClick={() => setSearchQuery(f === searchQuery ? "" : f)}
              >
                {f === ""
                  ? "すべて"
                  : f === "free"
                    ? "空きあり"
                    : f === "few"
                      ? "残りわずか"
                      : "満車"}
              </button>
            ))}
          </div>
          <div className="dest-results">
            {filteredLots.map((lot) => {
              const sc = getStatusClass(lot.available_spots, lot.total_spots, lot.isEv3Linked);
              const sl = sc === "full" ? "満車" : sc === "few" ? "残りわずか" : "空きあり";
              return (
                <button
                  type="button"
                  key={lot.id}
                  className="search-result-item"
                  style={{
                    width: "100%",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    padding: 0,
                  }}
                  onClick={() => {
                    setSelectedLotId(lot.id);
                    setPanelOpen(true);
                    setShowSearch(false);
                    setSearchQuery("");
                    mapRef.current?.panTo({ lat: lot.latitude, lng: lot.longitude });
                  }}
                >
                  <div className="result-main">
                    <div className="result-info">
                      <div className="result-name">{lot.name}</div>
                      <div className="result-meta">
                        <span>
                          空き {lot.available_spots}/{lot.total_spots}台
                        </span>
                        <span>¥{lot.price_per_hour}/時間</span>
                      </div>
                    </div>
                    <span className={`result-status ${sc}`}>{sl}</span>
                  </div>
                </button>
              );
            })}
            {filteredLots.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text2)" }}>
                該当する駐輪場が見つかりません
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== MY駐輪場パネル ===== */}
      {showFavorites && (
        <div className="destination-search-panel">
          <div className="dest-panel-header">
            <button type="button" className="back-btn" onClick={() => setShowFavorites(false)}>
              <FaChevronLeft />
            </button>
            <div style={{ flex: 1, fontWeight: 700, color: "var(--text)", paddingLeft: "8px" }}>
              MY駐輪場
            </div>
          </div>
          <div className="dest-results">
            {lots
              .filter((l) => favoriteLotIds.includes(l.id))
              .map((lot) => {
                const sc = getStatusClass(lot.available_spots, lot.total_spots, lot.isEv3Linked);
                const sl = sc === "full" ? "満車" : sc === "few" ? "残りわずか" : "空きあり";
                return (
                  <button
                    type="button"
                    key={lot.id}
                    className="search-result-item"
                    style={{
                      width: "100%",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      padding: 0,
                    }}
                    onClick={() => {
                      setSelectedLotId(lot.id);
                      setPanelOpen(true);
                      setShowFavorites(false);
                      mapRef.current?.panTo({ lat: lot.latitude, lng: lot.longitude });
                    }}
                  >
                    <div className="result-main">
                      <div className="result-info">
                        <div className="result-name">{lot.name}</div>
                        <div className="result-meta">
                          <span>
                            空き {lot.available_spots}/{lot.total_spots}台
                          </span>
                          <span>¥{lot.price_per_hour}/時間</span>
                        </div>
                      </div>
                      <span className={`result-status ${sc}`}>{sl}</span>
                    </div>
                  </button>
                );
              })}
            {favoriteLotIds.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text2)" }}>
                MY駐輪場に登録されている駐輪場はありません。
                <br />
                <br />
                詳細パネルの <FaStar style={{ display: "inline-block", color: "#cbd5e1" }} />{" "}
                アイコンから登録できます。
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== ボトムパネル（ログイン後） ===== */}
      {showBottomPanel && (
        <div
          className={`bottom-panel logged-panel ${panelOpen ? "collapsed" : ""}`}
          id="main-bottom-panel"
        >
          <button
            type="button"
            className="panel-toggle-handle"
            onClick={() => setPanelOpen(!panelOpen)}
            aria-label="パネルを開閉する"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "block",
              width: "100%",
            }}
          />

          <div className="bottom-left-panel">
            <div className="bottom-panel-label">
              <FaLocationDot style={{ display: "inline-block" }} /> 周辺の駐輪場
            </div>
            <div className="nearby-mini-list" id="nearby-mini-list">
              {lots.map((lot) => {
                const sClass = getStatusClass(
                  lot.available_spots,
                  lot.total_spots,
                  lot.isEv3Linked
                );
                const isFavorite = favoriteLotIds.includes(lot.id);
                return (
                  <button
                    type="button"
                    key={lot.id}
                    className="mini-item"
                    style={{
                      width: "100%",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    onClick={() => {
                      setSelectedLotId(lot.id);
                      setPanelOpen(true);
                      mapRef.current?.panTo({ lat: lot.latitude, lng: lot.longitude });
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {isFavorite && <FaStar style={{ color: "#f59e0b", flexShrink: 0 }} />}
                      <span
                        className="mini-item-name"
                        style={{
                          flex: 1,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {lot.name}
                      </span>
                    </div>
                    <span className={`badge ${sClass}`}>{lot.available_spots}台</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bottom-right-panel">
            <button
              type="button"
              className="right-panel-btn destination-btn"
              onClick={() => {
                setShowSearch(true);
                setPanelOpen(false);
                setShowNotif(false);
                setShowFavorites(false);
              }}
            >
              <div className="btn-icon-box dest">
                <FaMagnifyingGlass />
              </div>
              <div className="btn-text-content">
                <span className="btn-main-label">目的地</span>
              </div>
            </button>
            {/* お気に入り */}
            <button
              type="button"
              className="right-panel-btn my-btn"
              onClick={() => {
                setShowFavorites(true);
                setPanelOpen(false);
                setShowSearch(false);
                setShowNotif(false);
              }}
            >
              <div className="btn-icon-box my">
                <FaStar />
              </div>
              <div className="btn-text-content">
                <span className="btn-main-label">MY駐輪</span>
              </div>
            </button>
            {/* 予約 */}
            <button
              type="button"
              className="right-panel-btn history-btn"
              onClick={() => void navigate({ to: "/reservations" })}
            >
              <div className="btn-icon-box history">
                <FaCalendarCheck />
              </div>
              <div className="btn-text-content">
                <span className="btn-main-label">予約</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ===== ルートプレビューパネル ===== */}
      {routeViewMode === "preview" && selectedLot && (
        <RoutePreviewPanel
          isLoading={isRouteLoading}
          error={routeError}
          activeTravelMode={activeTravelMode}
          modeDurations={modeDurations}
          activeCandidates={activeCandidates}
          selectedRouteIndex={selectedRouteIndex}
          destinationName={selectedLot.name}
          onSelectTravelMode={handleSelectTravelMode}
          onSelectRoute={setSelectedRouteIndex}
          onStart={handleStartNavigation}
          onBackToDetail={handleBackToDetail}
          onClose={handleCloseRoute}
        />
      )}

      {/* ===== ナビゲーションパネル ===== */}
      {routeViewMode === "navigating" && (
        <>
          <NavRecenterButton
            visible={navMapFollow.showRecenterButton}
            onClick={navMapFollow.recenterOnUser}
          />
          <NavigationPanel
            instruction={navigation.nextInstruction}
            remainingDistanceMeters={navigation.remainingDistance}
            remainingDurationSec={navigation.remainingDurationSec}
            isComplete={navigation.isComplete}
            onEnd={handleEndNavigation}
          />
        </>
      )}

      {/* ===== 駐輪場詳細パネル ===== */}
      <div
        id="detail-panel"
        className={`lot-detail-panel ${panelOpen && routeViewMode === "idle" ? "" : "hidden"}`}
      >
        <div className="panel-drag-handle" />
        <button type="button" className="panel-close-btn" onClick={handleClosePanel}>
          <FaXmark />
        </button>
        <div
          className="panel-header"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
        >
          <div>
            <h2 id="lot-title">{selectedLot?.name ?? "駐輪場名"}</h2>
            <span id="lot-status-badge" className={`badge ${statusClass}`}>
              {statusLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={() => selectedLot && toggleFavorite(selectedLot.id)}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              color: selectedLot && favoriteLotIds.includes(selectedLot.id) ? "#f59e0b" : "#cbd5e1",
              cursor: "pointer",
              padding: "4px",
            }}
            title="MY駐輪場に登録/解除"
          >
            <FaStar />
          </button>
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
        </div>
        {reserveSuccess && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#10b981",
              fontWeight: 700,
              fontSize: "0.9rem",
              marginBottom: "12px",
            }}
          >
            <FaCircleCheck /> 予約完了済み
          </div>
        )}
        <div style={{ fontSize: "0.85rem", color: "var(--text2)", marginBottom: "12px" }}>
          {mapMessage}
        </div>
        <div
          className="panel-actions"
          style={{ display: "flex", flexDirection: "column", gap: "8px" }}
        >
          <div style={{ display: "flex", gap: "8px", width: "100%" }}>
            <button
              type="button"
              id="nav-btn"
              className="secondary-btn"
              onClick={handleRoute}
              disabled={isRouteLoading}
            >
              <FaLocationArrow /> ルート
            </button>
            <button type="button" className="secondary-btn" onClick={() => setShowFloorPlan(true)}>
              <FaMap /> 見取り図参照
            </button>
          </div>
          {isDevUser() && (
            <div style={{ display: "flex", gap: "8px", width: "100%", marginTop: "4px" }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  window.open(`/gate-camera?parkingLotId=${selectedLot?.id}`, "_blank")
                }
                style={{ fontSize: "0.8rem", padding: "6px" }}
              >
                ゲートカメラを開く
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  window.open(`/overhead-camera?parkingLotId=${selectedLot?.id}`, "_blank")
                }
                style={{ fontSize: "0.8rem", padding: "6px" }}
              >
                俯瞰カメラを開く
              </button>
            </div>
          )}
          <button
            type="button"
            id="reserve-trigger-btn"
            className="primary-btn"
            onClick={() => setShowReserveModal(true)}
            disabled={statusClass === "full" || reserveSuccess}
          >
            <FaCalendarCheck /> {reserveSuccess ? "予約済み" : "予約する"}
          </button>
        </div>
      </div>

      {/* ===== 見取り図モーダル ===== */}
      {showFloorPlan && (
        <FloorPlanModal
          onClose={() => setShowFloorPlan(false)}
          availableSpots={selectedLot?.available_spots ?? 0}
        />
      )}

      {/* ===== 予約モーダル ===== */}
      {showReserveModal && selectedLot && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          style={{ zIndex: 2000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowReserveModal(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowReserveModal(false);
          }}
        >
          <div className="modal-content">
            <div className="modal-drag-handle" />
            <div className="modal-header">
              <h2>{selectedLot.name}</h2>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setShowReserveModal(false)}
              >
                <FaXmark />
              </button>
            </div>
            <div className="form-group">
              <label htmlFor="reserve-hours">利用時間</label>
              <select
                id="reserve-hours"
                className="form-group select"
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1.5px solid var(--border)",
                  borderRadius: "12px",
                  fontSize: "1rem",
                  background: "var(--surface)",
                }}
                value={reserveHours}
                onChange={(e) => setReserveHours(Number(e.target.value))}
              >
                {[1, 2, 3, 6, 12, 24].map((h) => (
                  <option key={h} value={h}>
                    {h}時間
                  </option>
                ))}
              </select>
            </div>
            <div className="price-preview">
              <FaCalendarCheck style={{ color: "var(--primary)" }} />
              <span>
                料金目安: ¥{selectedLot.price_per_hour * reserveHours}（{reserveHours}時間）
              </span>
            </div>
            <button
              type="button"
              className="primary-btn"
              onClick={handleReserve}
              disabled={isReserving}
            >
              <FaCalendarCheck /> {isReserving ? "予約中..." : "予約を確定する"}
            </button>
            <button
              type="button"
              style={{
                width: "100%",
                padding: "12px",
                background: "none",
                border: "none",
                color: "var(--text2)",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
                marginTop: "8px",
              }}
              onClick={() => setShowReserveModal(false)}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* ===== サイドドロワー (Admin/Dev) ===== */}
      <MapSideDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
};

export default MapComponent;
