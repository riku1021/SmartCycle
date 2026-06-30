import type { FC, ReactNode } from "react";
import {
  FaArrowRight,
  FaArrowTurnUp,
  FaArrowUp,
  FaLocationArrow,
  FaLocationDot,
  FaXmark,
} from "react-icons/fa6";
import { formatManeuverAheadDistance } from "./types/route";

type NavigationPanelProps = {
  distanceToManeuverMeters: number;
  maneuverAction: string;
  stepDetail: string | null;
  remainingDistanceMeters: number;
  remainingDurationSec: number;
  maneuver: string | undefined;
  isComplete: boolean;
  onEnd: () => void;
};

const formatDistance = (meters: number): string => {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
};

const formatDuration = (sec: number): string => {
  const mins = Math.max(1, Math.ceil(sec / 60));
  return `${mins} 分`;
};

const ManeuverIcon: FC<{ maneuver: string | undefined }> = ({ maneuver }) => {
  let icon: ReactNode = <FaArrowUp />;
  let rotation = 0;

  switch (maneuver) {
    case "turn-right":
    case "turn-sharp-right":
    case "ramp-right":
    case "fork-right":
    case "keep-right":
    case "roundabout-right":
      icon = <FaArrowRight />;
      break;
    case "turn-left":
    case "turn-sharp-left":
    case "ramp-left":
    case "fork-left":
    case "keep-left":
    case "roundabout-left":
      icon = <FaArrowRight />;
      rotation = 180;
      break;
    case "turn-slight-right":
      icon = <FaArrowRight />;
      rotation = 45;
      break;
    case "turn-slight-left":
      icon = <FaArrowRight />;
      rotation = 135;
      break;
    case "uturn-left":
    case "uturn-right":
      icon = <FaArrowTurnUp />;
      break;
    case "straight":
    case "merge":
      icon = <FaArrowUp />;
      break;
    default:
      icon = <FaLocationArrow />;
  }

  return (
    <span
      className="navigation-maneuver-icon-inner"
      style={rotation !== 0 ? { transform: `rotate(${rotation}deg)` } : undefined}
    >
      {icon}
    </span>
  );
};

export const NavigationPanel: FC<NavigationPanelProps> = ({
  distanceToManeuverMeters,
  maneuverAction,
  stepDetail,
  remainingDistanceMeters,
  remainingDurationSec,
  maneuver,
  isComplete,
  onEnd,
}) => (
  <div className="navigation-panel">
    <div className="panel-drag-handle" />
    <div className="navigation-panel-header">
      <FaLocationArrow className="navigation-panel-icon" />
      <span>ナビゲーション中</span>
      <button type="button" className="navigation-end-btn" onClick={onEnd}>
        <FaXmark /> 終了
      </button>
    </div>

    {isComplete ? (
      <div className="navigation-maneuver-row">
        <div className="navigation-maneuver-icon destination">
          <FaLocationDot />
        </div>
        <div className="navigation-maneuver-text">
          <div className="navigation-instruction complete">目的地に到着しました</div>
        </div>
      </div>
    ) : (
      <div className="navigation-maneuver-row">
        <div className="navigation-maneuver-icon">
          <ManeuverIcon maneuver={maneuver} />
        </div>
        <div className="navigation-maneuver-text">
          <div className="navigation-maneuver-distance">
            {formatManeuverAheadDistance(distanceToManeuverMeters)}
          </div>
          <div className="navigation-maneuver-action">{maneuverAction}</div>
          {stepDetail && stepDetail !== maneuverAction && (
            <div className="navigation-maneuver-detail">{stepDetail}</div>
          )}
        </div>
      </div>
    )}

    <div className="navigation-stats">
      <span>残り {formatDistance(remainingDistanceMeters)}</span>
      <span> · </span>
      <span>約 {formatDuration(remainingDurationSec)}</span>
    </div>
  </div>
);
