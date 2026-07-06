import { AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import type { FC } from "react";
import { useEffect, useState } from "react";

type CurrentLocationMarkerProps = {
  position: [number, number];
  heading: number | null;
};

export const CurrentLocationMarker: FC<CurrentLocationMarkerProps> = ({ position, heading }) => {
  const map = useMap();
  const [mapHeading, setMapHeading] = useState(0);

  useEffect(() => {
    if (!map) return;

    const syncHeading = () => {
      setMapHeading(map.getHeading() ?? 0);
    };

    syncHeading();
    const listener = map.addListener("heading_changed", syncHeading);
    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map]);

  const beamRotation = heading !== null ? heading - mapHeading : 0;
  const showBeam = heading !== null;

  return (
    <AdvancedMarker position={{ lat: position[0], lng: position[1] }} title="現在地" zIndex={1000}>
      <div className="current-location-marker">
        {showBeam && (
          <div
            className="current-location-beam"
            style={{ transform: `rotate(${beamRotation}deg)` }}
            aria-hidden
          />
        )}
        <div className="current-location-dot" />
        <div className="current-location-ring" aria-hidden />
      </div>
    </AdvancedMarker>
  );
};
