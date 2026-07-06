import { AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import type { FC } from "react";
import { useEffect, useRef } from "react";
import type { RouteCandidate } from "./types/route";

type RouteMapLayerProps = {
  candidates: RouteCandidate[];
  selectedRouteIndex: number;
  showTimeBubbles: boolean;
  onSelectRoute: (index: number) => void;
  autoFitBounds?: boolean;
  fitBoundsPadding?: { top: number; right: number; bottom: number; left: number };
};

export const RouteMapLayer: FC<RouteMapLayerProps> = ({
  candidates,
  selectedRouteIndex,
  showTimeBubbles,
  onSelectRoute,
  autoFitBounds = true,
  fitBoundsPadding = { top: 80, right: 40, bottom: 200, left: 40 },
}) => {
  const map = useMap();
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!map) return;

    for (const poly of polylinesRef.current) {
      poly.setMap(null);
    }
    polylinesRef.current = [];

    if (candidates.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      const isSelected = i === selectedRouteIndex;
      const polyline = new google.maps.Polyline({
        path: candidate.path,
        geodesic: true,
        strokeColor: isSelected ? "#4F46E5" : "#94a3b8",
        strokeOpacity: isSelected ? 0.95 : 0.6,
        strokeWeight: isSelected ? 6 : 4,
        zIndex: isSelected ? 2 : 1,
      });
      polyline.setMap(map);
      polylinesRef.current.push(polyline);

      for (const p of candidate.path) {
        bounds.extend(p);
      }
    }

    if (autoFitBounds) {
      map.fitBounds(bounds, fitBoundsPadding);
    }

    return () => {
      for (const poly of polylinesRef.current) {
        poly.setMap(null);
      }
      polylinesRef.current = [];
    };
  }, [map, candidates, selectedRouteIndex, autoFitBounds, fitBoundsPadding]);

  if (!showTimeBubbles || candidates.length <= 1) return null;

  return (
    <>
      {candidates.map((candidate, index) => (
        <AdvancedMarker
          key={`route-bubble-${index}`}
          position={candidate.midpoint}
          onClick={() => onSelectRoute(index)}
        >
          <button
            type="button"
            className={`route-time-bubble ${index === selectedRouteIndex ? "selected" : ""}`}
            onClick={() => onSelectRoute(index)}
          >
            {candidate.durationText}
          </button>
        </AdvancedMarker>
      ))}
    </>
  );
};
