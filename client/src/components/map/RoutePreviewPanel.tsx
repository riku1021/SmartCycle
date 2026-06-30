import type { FC } from "react";
import {
  FaBicycle,
  FaLocationArrow,
  FaLocationDot,
  FaPersonWalking,
  FaXmark,
} from "react-icons/fa6";
import {
  type AppTravelMode,
  formatArrivalTime,
  type RouteCandidate,
  TRAVEL_MODE_CONFIG,
} from "./types/route";

type RoutePreviewPanelProps = {
  isLoading: boolean;
  error: string | null;
  activeTravelMode: AppTravelMode;
  modeDurations: Partial<Record<AppTravelMode, string>>;
  activeCandidates: RouteCandidate[];
  selectedRouteIndex: number;
  destinationName: string;
  onSelectTravelMode: (mode: AppTravelMode) => void;
  onSelectRoute: (index: number) => void;
  onStart: () => void;
  onBackToDetail: () => void;
  onClose: () => void;
};

const modeIcon = (mode: AppTravelMode) => {
  switch (mode) {
    case "WALKING":
      return <FaPersonWalking />;
    case "BICYCLING":
      return <FaBicycle />;
  }
};

export const RoutePreviewPanel: FC<RoutePreviewPanelProps> = ({
  isLoading,
  error,
  activeTravelMode,
  modeDurations,
  activeCandidates,
  selectedRouteIndex,
  destinationName,
  onSelectTravelMode,
  onSelectRoute,
  onStart,
  onBackToDetail,
  onClose,
}) => {
  const selected = activeCandidates[selectedRouteIndex] ?? null;

  return (
    <div className="route-preview-panel">
      <button type="button" className="route-preview-close" onClick={onClose} aria-label="閉じる">
        <FaXmark />
      </button>

      <div className="route-mode-tabs">
        {TRAVEL_MODE_CONFIG.map(({ mode, label }) => {
          const duration = modeDurations[mode];
          const disabled = !duration && !isLoading;
          return (
            <button
              key={mode}
              type="button"
              className={`route-mode-tab ${activeTravelMode === mode ? "active" : ""}`}
              onClick={() => onSelectTravelMode(mode)}
              disabled={disabled}
              aria-label={label}
            >
              <span className="route-mode-tab-icon">{modeIcon(mode)}</span>
              <span className="route-mode-tab-time">{duration ?? "—"}</span>
            </button>
          );
        })}
      </div>

      {isLoading && (
        <div className="route-preview-loading">
          <div className="spinner-mini" />
          <span>ルートを計算しています...</span>
        </div>
      )}

      {error && !isLoading && <div className="route-preview-error">{error}</div>}

      {selected && !isLoading && (
        <div className="route-summary-block">
          <div className="route-summary-row">
            <div className="route-summary-duration-col">
              <span className="route-summary-duration">{selected.durationText}</span>
            </div>

            <div className="route-summary-meta">
              <div className="route-summary-meta-line">
                <span>{formatArrivalTime(selected.durationSec)}</span>
                <span className="route-summary-sep">·</span>
                <span className="route-summary-distance">{selected.distanceText}</span>
              </div>
              {selected.summary && (
                <div className="route-summary-via" title={selected.summary}>
                  {selected.summary}
                </div>
              )}
            </div>

            <div className="route-summary-dest">
              <FaLocationDot className="route-summary-dest-icon" />
              <div className="route-summary-dest-text">
                <span className="route-summary-dest-label">目的地</span>
                <span className="route-summary-dest-name" title={destinationName}>
                  {destinationName}
                </span>
              </div>
            </div>
          </div>

          {activeCandidates.length > 1 && (
            <div className="route-candidate-chips">
              {activeCandidates.map((candidate, index) => (
                <button
                  key={`chip-${index}`}
                  type="button"
                  className={`route-candidate-chip ${index === selectedRouteIndex ? "active" : ""}`}
                  onClick={() => onSelectRoute(index)}
                >
                  ルート {index + 1} · {candidate.durationText}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="route-preview-actions">
        <button
          type="button"
          className="primary-btn route-start-btn"
          onClick={onStart}
          disabled={isLoading || !selected}
        >
          <FaLocationArrow /> 開始
        </button>
      </div>
      <button type="button" className="route-back-link" onClick={onBackToDetail}>
        駐輪場詳細に戻る
      </button>
    </div>
  );
};
