import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import type { RouteViewMode } from "../types/route";

const NAV_TILT = 45;
const NAV_ZOOM = 18;

type UseNavMapFollowParams = {
  mapRef: RefObject<google.maps.Map | null>;
  currentLatLng: [number, number];
  routeViewMode: RouteViewMode;
  heading: number | null;
};

const applyNavCamera = (map: google.maps.Map, lat: number, lng: number, heading: number | null) => {
  const camera: google.maps.CameraOptions = {
    center: { lat, lng },
    tilt: NAV_TILT,
    zoom: NAV_ZOOM,
  };
  if (heading !== null) {
    camera.heading = heading;
  }
  map.moveCamera(camera);
};

const resetMapCamera = (map: google.maps.Map) => {
  map.moveCamera({ tilt: 0, heading: 0 });
};

export const useNavMapFollow = ({
  mapRef,
  currentLatLng,
  routeViewMode,
  heading,
}: UseNavMapFollowParams) => {
  const isFollowingRef = useRef(true);
  const lastHeadingRef = useRef<number | null>(null);
  const [showRecenterButton, setShowRecenterButton] = useState(false);

  const resolveHeading = useCallback(() => {
    if (heading !== null) {
      lastHeadingRef.current = heading;
      return heading;
    }
    return lastHeadingRef.current;
  }, [heading]);

  const updateRecenterVisibility = useCallback(() => {
    const map = mapRef.current;
    if (!map || routeViewMode !== "navigating") {
      setShowRecenterButton(false);
      return;
    }

    const bounds = map.getBounds();
    if (!bounds) return;

    const position = new google.maps.LatLng(currentLatLng[0], currentLatLng[1]);
    const isVisible = bounds.contains(position);
    setShowRecenterButton(!isFollowingRef.current || !isVisible);
  }, [currentLatLng, mapRef, routeViewMode]);

  const startFollowing = useCallback(() => {
    isFollowingRef.current = true;
    setShowRecenterButton(false);
    const map = mapRef.current;
    if (map) {
      applyNavCamera(map, currentLatLng[0], currentLatLng[1], resolveHeading());
    }
  }, [currentLatLng, mapRef, resolveHeading]);

  const recenterOnUser = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    applyNavCamera(map, currentLatLng[0], currentLatLng[1], resolveHeading());
    isFollowingRef.current = true;
    setShowRecenterButton(false);
  }, [currentLatLng, mapRef, resolveHeading]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || routeViewMode !== "navigating") {
      setShowRecenterButton(false);
      return;
    }

    isFollowingRef.current = true;
    applyNavCamera(map, currentLatLng[0], currentLatLng[1], resolveHeading());

    const onUserInteraction = () => {
      isFollowingRef.current = false;
      updateRecenterVisibility();
    };

    const dragListener = map.addListener("dragend", onUserInteraction);
    const zoomListener = map.addListener("zoom_changed", () => {
      if (!isFollowingRef.current) updateRecenterVisibility();
    });
    const idleListener = map.addListener("idle", updateRecenterVisibility);

    updateRecenterVisibility();

    return () => {
      google.maps.event.removeListener(dragListener);
      google.maps.event.removeListener(zoomListener);
      google.maps.event.removeListener(idleListener);
    };
  }, [routeViewMode, mapRef, updateRecenterVisibility, currentLatLng, resolveHeading]);

  useEffect(() => {
    if (routeViewMode !== "navigating" || !mapRef.current || !isFollowingRef.current) return;
    applyNavCamera(mapRef.current, currentLatLng[0], currentLatLng[1], resolveHeading());
    updateRecenterVisibility();
  }, [currentLatLng, routeViewMode, mapRef, updateRecenterVisibility, resolveHeading]);

  useEffect(() => {
    if (routeViewMode === "navigating") return;
    const map = mapRef.current;
    if (!map) return;
    resetMapCamera(map);
    lastHeadingRef.current = null;
  }, [routeViewMode, mapRef]);

  return {
    showRecenterButton,
    startFollowing,
    recenterOnUser,
  };
};
