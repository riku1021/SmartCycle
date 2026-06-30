import type { FC } from "react";
import { FaArrowRight, FaXmark } from "react-icons/fa6";

type RouteOriginDestinationBarProps = {
  destinationName: string;
  onClose: () => void;
};

export const RouteOriginDestinationBar: FC<RouteOriginDestinationBarProps> = ({
  destinationName,
  onClose,
}) => (
  <div className="route-od-bar">
    <div className="route-od-card">
      <div className="route-od-row">
        <span className="route-od-dot origin" />
        <span className="route-od-label">現在地</span>
      </div>
      <div className="route-od-divider" />
      <div className="route-od-row">
        <span className="route-od-dot destination" />
        <span className="route-od-label">{destinationName}</span>
      </div>
      <FaArrowRight className="route-od-arrow" />
    </div>
    <button type="button" className="route-od-close" onClick={onClose} aria-label="ルートを閉じる">
      <FaXmark />
    </button>
  </div>
);
