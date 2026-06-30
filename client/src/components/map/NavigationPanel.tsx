import type { FC } from "react";
import { FaLocationArrow, FaXmark } from "react-icons/fa6";

type NavigationPanelProps = {
  instruction: string;
  remainingDistanceMeters: number;
  remainingDurationSec: number;
  isComplete: boolean;
  onEnd: () => void;
};

const formatDistance = (meters: number): string => {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${meters} m`;
};

const formatDuration = (sec: number): string => {
  const mins = Math.max(1, Math.ceil(sec / 60));
  return `${mins} 分`;
};

export const NavigationPanel: FC<NavigationPanelProps> = ({
  instruction,
  remainingDistanceMeters,
  remainingDurationSec,
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
      <div className="navigation-instruction complete">目的地に到着しました</div>
    ) : (
      <div className="navigation-instruction">{instruction || "ルートに沿って進んでください"}</div>
    )}

    <div className="navigation-stats">
      <span>残り {formatDistance(remainingDistanceMeters)}</span>
      <span> · </span>
      <span>約 {formatDuration(remainingDurationSec)}</span>
    </div>
  </div>
);
