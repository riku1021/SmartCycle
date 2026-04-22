import "leaflet/dist/leaflet.css";
import { Badge, Box, Button, Flex, Heading, IconButton, Text } from "@chakra-ui/react";
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
      const pinColor = status === "full" ? "#ef4444" : status === "few" ? "#f59e0b" : "#10b981";
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:44px;height:44px;border-radius:50%;
          border:3px solid #fff;
          box-shadow:0 4px 10px rgba(0,0,0,0.3);
          display:flex;flex-direction:column;justify-content:center;align-items:center;
          color:#fff;font-weight:800;font-size:0.85rem;background:${pinColor};
        ">
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
    <AppLayout hideHeader isMapLayout subtitle="地図から近くの駐輪場を探せます" title="マップ検索">
      <Box
        h="100%"
        minH={{ base: "calc(100vh - 74px)", md: "100vh" }}
        overflow="hidden"
        position="relative"
      >
        <Box id="map" inset={0} position="absolute" ref={mapContainerRef} />

        <IconButton
          aria-label="現在地を取得"
          borderRadius="full"
          bottom={{ base: "90px", md: "40px" }}
          boxShadow="0 4px 10px rgba(0, 0, 0, 0.15)"
          color="#4f46e5"
          h="56px"
          disabled={isLocating}
          onClick={handleLocateUser}
          position="absolute"
          right={{ base: "20px", md: "40px" }}
          variant="solid"
          w="56px"
          zIndex={1000}
        >
          {isLocating ? <Text fontSize="md">...</Text> : <FaLocationCrosshairs />}
        </IconButton>

        <Box
          bg="rgba(255, 255, 255, 0.95)"
          border="1px solid rgba(255, 255, 255, 0.5)"
          borderRadius="3xl"
          boxShadow="panel"
          left={{ base: 3, md: "auto" }}
          opacity={panelOpen ? 1 : 0}
          p={6}
          pointerEvents={panelOpen ? "auto" : "none"}
          position="absolute"
          right={{ base: 3, md: "40px" }}
          top={{ base: 3, md: "40px" }}
          transform={panelOpen ? "translateX(0)" : "translateX(20px)"}
          transition="all 0.3s"
          w={{ base: "auto", md: "360px" }}
          zIndex={1000}
        >
          <IconButton
            aria-label="閉じる"
            color="#64748b"
            onClick={handleClosePanel}
            position="absolute"
            right={5}
            top={5}
            variant="ghost"
          >
            <FaXmark />
          </IconButton>

          <Box mb={6} pr={8}>
            <Heading as="h2" fontSize="1.4rem" mb={3}>
              {selectedLot?.name ?? "駐輪場名"}
            </Heading>
            <Badge
              bg={
                statusClass === "full" ? "#ef4444" : statusClass === "few" ? "#f59e0b" : "#10b981"
              }
              borderRadius="full"
              color="white"
              px={3}
              py={1.5}
            >
              {statusLabel}
            </Badge>
          </Box>

          <Flex gap={4} mb={5}>
            <Box bg="#f1f5f9" borderRadius="xl" flex={1} p={4}>
              <Text color="#64748b" fontSize="0.8rem" fontWeight={600}>
                空き台数
              </Text>
              <Text color="#0f172a" fontSize="1rem" fontWeight={700}>
                <Text as="strong" color="#4f46e5" fontSize="1.5rem" fontWeight={800}>
                  {selectedLot?.available_spots ?? 0}
                </Text>{" "}
                / {selectedLot?.total_spots ?? 0}
              </Text>
            </Box>
            <Box bg="#f1f5f9" borderRadius="xl" flex={1} p={4}>
              <Text color="#64748b" fontSize="0.8rem" fontWeight={600}>
                料金
              </Text>
              <Text color="#0f172a" fontSize="1rem" fontWeight={700}>
                ¥<Text as="strong">{selectedLot?.price_per_hour ?? 0}</Text>/h
              </Text>
            </Box>
          </Flex>
          <Text color="#64748b" fontSize="0.9rem" mb={5}>
            {mapMessage}
          </Text>

          <Flex gap={3}>
            <Button
              colorScheme="gray"
              flex={1}
              disabled={isRouting}
              onClick={handleRoute}
              variant="outline"
            >
              <Flex align="center" gap={2}>
                <FaLocationArrow />
                ルート
              </Flex>
            </Button>
            <Button colorScheme="purple" disabled flex={1}>
              予約する
            </Button>
          </Flex>
        </Box>
      </Box>
    </AppLayout>
  );
};

export default MapComponent;
