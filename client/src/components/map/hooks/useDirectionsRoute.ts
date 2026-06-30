import { useCallback, useState } from "react";
import {
  type AppTravelMode,
  type LatLng,
  type RouteCandidate,
  routeMidpoint,
  routePathFromOverview,
  type TravelModeRoutes,
} from "../types/route";

type FetchRoutesParams = {
  origin: LatLng;
  destination: LatLng;
  travelMode: AppTravelMode;
};

const toCandidate = (route: google.maps.DirectionsRoute): RouteCandidate | null => {
  const leg = route.legs[0];
  if (!leg) return null;
  const path = routePathFromOverview(route);
  if (path.length === 0) return null;
  return {
    route,
    path,
    durationText: leg.duration?.text ?? "",
    durationSec: leg.duration?.value ?? 0,
    distanceText: leg.distance?.text ?? "",
    summary: route.summary ?? leg.end_address ?? "",
    midpoint: routeMidpoint(path),
  };
};

const fetchRoutesForMode = async ({
  origin,
  destination,
  travelMode,
}: FetchRoutesParams): Promise<RouteCandidate[]> => {
  const directionsService = new google.maps.DirectionsService();
  const googleMode =
    travelMode === "WALKING" ? google.maps.TravelMode.WALKING : google.maps.TravelMode.BICYCLING;

  const result = await directionsService.route({
    origin,
    destination,
    travelMode: googleMode,
  });

  return result.routes
    .map((route) => toCandidate(route))
    .filter((c): c is RouteCandidate => c !== null);
};

export const useDirectionsRoute = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routesByMode, setRoutesByMode] = useState<TravelModeRoutes>({});
  const [activeTravelMode, setActiveTravelMode] = useState<AppTravelMode>("BICYCLING");
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [modeDurations, setModeDurations] = useState<Partial<Record<AppTravelMode, string>>>({});

  const fetchAllModes = useCallback(async (origin: LatLng, destination: LatLng) => {
    setIsLoading(true);
    setError(null);
    setRoutesByMode({});
    setSelectedRouteIndex(0);
    setModeDurations({});

    const modes: AppTravelMode[] = ["WALKING", "BICYCLING"];
    const results = await Promise.allSettled(
      modes.map((mode) => fetchRoutesForMode({ origin, destination, travelMode: mode }))
    );

    const nextRoutes: TravelModeRoutes = {};
    const nextDurations: Partial<Record<AppTravelMode, string>> = {};

    for (let i = 0; i < modes.length; i++) {
      const mode = modes[i];
      const result = results[i];
      if (result.status === "fulfilled" && result.value.length > 0) {
        nextRoutes[mode] = result.value;
        nextDurations[mode] = result.value[0].durationText;
      }
    }

    if (!nextRoutes.BICYCLING && !nextRoutes.WALKING) {
      setError("ルートの取得に失敗しました。");
      setIsLoading(false);
      return false;
    }

    setRoutesByMode(nextRoutes);
    setModeDurations(nextDurations);

    const defaultMode: AppTravelMode = nextRoutes.BICYCLING ? "BICYCLING" : "WALKING";
    setActiveTravelMode(defaultMode);
    setSelectedRouteIndex(0);
    setIsLoading(false);
    return true;
  }, []);

  const fetchMode = useCallback(
    async (origin: LatLng, destination: LatLng, travelMode: AppTravelMode) => {
      setIsLoading(true);
      setError(null);
      try {
        const candidates = await fetchRoutesForMode({ origin, destination, travelMode });
        if (candidates.length === 0) {
          setError("ルートの取得に失敗しました。");
          return false;
        }
        setRoutesByMode((prev) => ({ ...prev, [travelMode]: candidates }));
        setModeDurations((prev) => ({ ...prev, [travelMode]: candidates[0].durationText }));
        setSelectedRouteIndex(0);
        return true;
      } catch {
        setError("ルートの取得に失敗しました。");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const switchTravelMode = useCallback(
    async (mode: AppTravelMode, origin: LatLng, destination: LatLng) => {
      setActiveTravelMode(mode);
      setSelectedRouteIndex(0);
      if (routesByMode[mode]) return;
      await fetchMode(origin, destination, mode);
    },
    [fetchMode, routesByMode]
  );

  const resetRoutes = useCallback(() => {
    setRoutesByMode({});
    setModeDurations({});
    setActiveTravelMode("BICYCLING");
    setSelectedRouteIndex(0);
    setError(null);
    setIsLoading(false);
  }, []);

  const activeCandidates = routesByMode[activeTravelMode] ?? [];
  const selectedCandidate = activeCandidates[selectedRouteIndex] ?? null;

  return {
    isLoading,
    error,
    routesByMode,
    activeTravelMode,
    selectedRouteIndex,
    modeDurations,
    activeCandidates,
    selectedCandidate,
    setSelectedRouteIndex,
    fetchAllModes,
    switchTravelMode,
    resetRoutes,
  };
};
