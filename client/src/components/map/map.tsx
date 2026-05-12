import "leaflet/dist/leaflet.css";
import { useNavigate } from "@tanstack/react-router";
import L, { type GeoJSON, type Map as LeafletMap } from "leaflet";
import type { FC } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FaBars,
  FaBell,
  FaBicycle,
  FaCalendarCheck,
  FaChevronLeft,
  FaCircleCheck,
  FaClockRotateLeft,
  FaLocationArrow,
  FaLocationCrosshairs,
  FaLocationDot,
  FaMagnifyingGlass,
  FaUser,
  FaXmark,
} from "react-icons/fa6";
import { isAdminOrDevUser } from "@/lib/adminRole";
import MapSideDrawer from "./MapSideDrawer";

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

// モック通知
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

const MapComponent: FC = () => {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const routeLayerRef = useRef<GeoJSON | null>(null);

  const [currentLatLng, setCurrentLatLng] = useState<[number, number]>(MAP_CENTER);
  const [selectedLotId, setSelectedLotId] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mapMessage, setMapMessage] = useState("駐輪場を選択してください");

  const watchIdRef = useRef<number | null>(null);

  // ---- リアルタイム追跡の停止 ----
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  // UI 状態
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [reserveHours, setReserveHours] = useState(1);
  const [reserveSuccess, setReserveSuccess] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const showAdminMenu = isAdminOrDevUser();

  const unreadCount = notifications.filter((n) => n.unread).length;
  const selectedLot = selectedLotId ? LOTS.find((l) => l.id === selectedLotId) : null;

  const getStatusClass = useCallback(
    (available: number, total: number): "free" | "few" | "full" => {
      if (available === 0) return "full";
      if (available <= total * 0.2) return "few";
      return "free";
    },
    []
  );

  // ---- マップ初期化 ----
  useEffect(() => {
    const mapContainer = mapContainerRef.current;
    if (!mapContainer || mapRef.current) return;

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
      const title = status === "full" ? "満" : String(lot.available_spots);
      const pinColor = status === "full" ? "#ef4444" : status === "few" ? "#f59e0b" : "#10b981";
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:44px;height:44px;border-radius:50%;border:3px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,0.3);display:flex;flex-direction:column;justify-content:center;align-items:center;color:#fff;font-weight:800;font-size:0.85rem;background:${pinColor};cursor:pointer;">
          <span style="font-size:0.7rem;margin-bottom:2px;">P</span>
          <span>${title}</span>
        </div>`,
        iconSize: [44, 44],
        iconAnchor: [22, 44],
      });
      const marker = L.marker([lot.latitude, lot.longitude], { icon }).addTo(map);
      marker.on("click", () => {
        setSelectedLotId(lot.id);
        setPanelOpen(true);
        setShowSearch(false);
        map.panTo([lot.latitude, lot.longitude]);
      });
    });

    const resizeMap = () => map.invalidateSize();
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

  // ---- 現在地取得・追跡トグル ----
  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      setMapMessage("このブラウザは位置情報に対応していません");
      return;
    }

    if (isTracking) {
      stopTracking();
      setMapMessage("追跡を停止しました");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ll: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setCurrentLatLng(ll);
        userMarkerRef.current?.setLatLng(ll);
        mapRef.current?.flyTo(ll, 16);
        setMapMessage("位置を特定しました。追跡を開始します。");
        setIsLocating(false);
        setIsTracking(true);

        watchIdRef.current = navigator.geolocation.watchPosition(
          (p) => {
            const newLL: [number, number] = [p.coords.latitude, p.coords.longitude];
            setCurrentLatLng(newLL);
            userMarkerRef.current?.setLatLng(newLL);
          },
          () => {
            setMapMessage("追跡中にエラーが発生しました");
            stopTracking();
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      },
      () => {
        setMapMessage("位置情報を取得できませんでした");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  useEffect(() => {
    return () => stopTracking();
  }, [stopTracking]);

  // ---- ルート検索 ----
  const handleRoute = async () => {
    if (!selectedLot || !panelOpen) return;
    const map = mapRef.current;
    if (!map) return;

    setIsRouting(true);
    setMapMessage("ルートを計算しています...");
    try {
      if (routeLayerRef.current) {
        map.removeLayer(routeLayerRef.current);
        routeLayerRef.current = null;
      }
      const url = `https://router.project-osrm.org/route/v1/bicycle/${currentLatLng[1]},${currentLatLng[0]};${selectedLot.longitude},${selectedLot.latitude}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("route failed");
      const data = (await res.json()) as {
        routes?: Array<{ duration: number; geometry: GeoJSON.GeoJsonObject }>;
      };
      const route = data.routes?.[0];
      if (!route) throw new Error("no route");
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

  // ---- 詳細パネル閉じる ----
  const handleClosePanel = () => {
    setPanelOpen(false);
    setSelectedLotId(null);
    setReserveSuccess(false);
    if (routeLayerRef.current && mapRef.current) {
      mapRef.current.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }
  };

  // ---- 予約する ----
  const handleReserve = () => {
    if (!selectedLot) return;
    setReserveSuccess(true);
    setShowReserveModal(false);
    setMapMessage(`${selectedLot.name}の予約が完了しました！`);
    // 通知を追加
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
  };

  // ---- 検索フィルタ ----
  const filteredLots = searchQuery.trim()
    ? LOTS.filter(
        (l) =>
          l.name.includes(searchQuery) ||
          getStatusClass(l.available_spots, l.total_spots) === searchQuery
      )
    : LOTS;

  const statusClass = selectedLot
    ? getStatusClass(selectedLot.available_spots, selectedLot.total_spots)
    : "free";
  const statusLabel =
    statusClass === "full" ? "満車" : statusClass === "few" ? "残りわずか" : "空きあり";

  return (
    <div id="app-layout" className="full-map-screen">
      <div id="map" ref={mapContainerRef} />

      {/* ===== トップバー ===== */}
      <div className="app-top-bar">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {showAdminMenu && (
            <button
              type="button"
              className="top-action-btn"
              onClick={() => setDrawerOpen(true)}
              aria-label="メニューを開く"
              style={{ width: "42px", height: "42px" }}
            >
              <FaBars />
            </button>
          )}
          <div className="app-logo-small">
            <FaBicycle style={{ fontSize: "1.4rem" }} />
            <span>SmartCycle</span>
          </div>
        </div>
        <div className="app-top-actions">
          {/* 現在地ボタン */}
          <button
            type="button"
            className={`top-action-btn locate-btn ${isTracking ? "active-tracking" : ""}`}
            onClick={handleLocateUser}
            disabled={isLocating}
            title={isTracking ? "追跡を停止" : "現在地を追跡"}
          >
            {isLocating ? <div className="spinner-mini" /> : <FaLocationCrosshairs />}
          </button>

          {/* 通知ボタン */}
          <button
            type="button"
            className="top-action-btn notif-bell-btn"
            id="notif-btn"
            onClick={() => {
              setShowNotif(!showNotif);
              setShowSearch(false);
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
              const sc = getStatusClass(lot.available_spots, lot.total_spots);
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
                    mapRef.current?.panTo([lot.latitude, lot.longitude]);
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

      {/* ===== ボトムパネル（ログイン後） ===== */}
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
            {LOTS.map((lot) => {
              const sClass = getStatusClass(lot.available_spots, lot.total_spots);
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
                    mapRef.current?.panTo([lot.latitude, lot.longitude]);
                  }}
                >
                  <span className="mini-item-name">{lot.name}</span>
                  <span className={`badge ${sClass}`}>{lot.available_spots}台</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bottom-right-panel">
          {/* 目的地検索 */}
          <button
            type="button"
            className="right-panel-btn destination-btn"
            onClick={() => {
              setShowSearch(true);
              setPanelOpen(false);
              setShowNotif(false);
            }}
          >
            <div className="btn-icon-box dest">
              <FaMagnifyingGlass />
            </div>
            <div className="btn-text-content">
              <span className="btn-main-label">目的地</span>
              <span className="btn-sub-label">を検索する</span>
            </div>
          </button>
          {/* MYページ */}
          <button
            type="button"
            className="right-panel-btn my-btn"
            onClick={() => void navigate({ to: "/settings" })}
          >
            <div className="btn-icon-box my">
              <FaUser />
            </div>
            <div className="btn-text-content">
              <span className="btn-main-label">MYページ</span>
              <span className="btn-sub-label">設定・通知</span>
            </div>
          </button>
          {/* 利用履歴 */}
          <button
            type="button"
            className="right-panel-btn history-btn"
            onClick={() => void navigate({ to: "/reservations" })}
          >
            <div className="btn-icon-box history">
              <FaClockRotateLeft />
            </div>
            <div className="btn-text-content">
              <span className="btn-main-label">利用履歴</span>
              <span className="btn-sub-label">予約の確認</span>
            </div>
          </button>
        </div>
      </div>

      {/* ===== 駐輪場詳細パネル ===== */}
      <div id="detail-panel" className={`lot-detail-panel ${panelOpen ? "" : "hidden"}`}>
        <div className="panel-drag-handle" />
        <button type="button" className="panel-close-btn" onClick={handleClosePanel}>
          <FaXmark />
        </button>
        <div className="panel-header">
          <h2 id="lot-title">{selectedLot?.name ?? "駐輪場名"}</h2>
          <span id="lot-status-badge" className={`badge ${statusClass}`}>
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
        <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "12px" }}>
          {mapMessage}
        </div>
        <div className="panel-actions">
          <button
            type="button"
            id="nav-btn"
            className="secondary-btn"
            onClick={handleRoute}
            disabled={isRouting}
          >
            <FaLocationArrow /> ルート
          </button>
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
            <button type="button" className="primary-btn" onClick={handleReserve}>
              <FaCalendarCheck /> 予約を確定する
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
