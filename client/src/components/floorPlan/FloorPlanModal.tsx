import type { FC } from "react";
import { useEffect, useState } from "react";
import { FaXmark } from "react-icons/fa6";
import "./FloorPlanModal.css";

interface FloorPlanModalProps {
  onClose: () => void;
  availableSpots: number;
}

export const FloorPlanModal: FC<FloorPlanModalProps> = ({ onClose, availableSpots }) => {
  const [floor, setFloor] = useState<1 | 2>(1);
  const [floor1Spots, setFloor1Spots] = useState<number[]>([0, 0, 0, 0]);
  const [floor2Spots, setFloor2Spots] = useState<number[]>([0, 0, 0, 0]);

  useEffect(() => {
    // Determine how to distribute total availableSpots between the 2 floors
    // e.g. 1st floor gets ceil(availableSpots/2), 2nd floor gets floor(availableSpots/2)
    const floor1Available = Math.ceil(availableSpots / 2);
    const floor2Available = Math.floor(availableSpots / 2);

    const distributeSpots = (available: number) => {
      // 0台のエリアを最低1つ作るためのランダムインデックス
      const zeroIndex = Math.floor(Math.random() * 4);
      const availableIndices = [0, 1, 2, 3].filter((i) => i !== zeroIndex);
      const result = [0, 0, 0, 0];

      if (available > 0) {
        for (let i = 0; i < available; i++) {
          const randomIdx = availableIndices[Math.floor(Math.random() * availableIndices.length)];
          result[randomIdx]++;
        }
      }
      return result;
    };

    setFloor1Spots(distributeSpots(floor1Available));
    setFloor2Spots(distributeSpots(floor2Available));
  }, [availableSpots]);

  const currentSpots = floor === 1 ? floor1Spots : floor2Spots;

  const renderBadge = (count: number, color: string, top: string, left: string) => {
    const isFull = count === 0;
    // When full, use a subtle red, otherwise use a dark clear text color with a colored accent
    const textColor = isFull ? "#ef4444" : "#334155";
    const borderColor = isFull ? "rgba(239,68,68,0.4)" : "rgba(51,65,85,0.2)";
    return (
      <div
        style={{
          position: "absolute",
          top,
          left,
          transform: "translate(-50%, -50%)",
          zIndex: 20,
        }}
      >
        <div
          style={{
            color: textColor,
            fontSize: "clamp(0.65rem, 1.8vw, 0.85rem)",
            fontWeight: 800,
            background: "rgba(255,255,255,0.95)",
            border: `1px solid ${borderColor}`,
            boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
            padding: "4px 10px",
            borderRadius: "8px",
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          {!isFull && (
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: color }} />
          )}
          {isFull ? "満 車" : `空 ${count} 台`}
        </div>
      </div>
    );
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      style={{ zIndex: 2000 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="modal-content floorplan-modal">
        <div className="modal-drag-handle" />
        <div className="modal-header">
          <div />
          <button type="button" className="close-modal-btn" onClick={onClose}>
            <FaXmark />
          </button>
        </div>

        <div className="floorplan-body">
          <div className="floorplan-layout">
            <div className="floorplan-sidebar">
              <button
                type="button"
                className={`floor-btn ${floor === 1 ? "active" : ""}`}
                onClick={() => setFloor(1)}
              >
                1階
              </button>
              <button
                type="button"
                className={`floor-btn ${floor === 2 ? "active" : ""}`}
                onClick={() => setFloor(2)}
              >
                2階
              </button>
            </div>

            <div className="floorplan-container">
              {/* Colored Zones */}
              <div className="fp-zone fp-blue-top-left" />
              <div className="fp-zone fp-blue-top-right" />
              <div className="fp-zone fp-blue-bottom" />

              <div className="fp-zone fp-white-manage">
                <span className="fp-text">管理室</span>
              </div>

              <div className="fp-zone fp-red" />
              <div className="fp-zone fp-green" />
              <div className="fp-zone fp-yellow" />

              {/* Area Badges */}
              {renderBadge(currentSpots[0], "#3b82f6", "25%", "15%")}
              {renderBadge(currentSpots[1], "#10b981", "62.5%", "50%")}
              {renderBadge(currentSpots[2], "#f43f5e", "20%", "77.5%")}
              {renderBadge(currentSpots[3], "#eab308", "70%", "90%")}

              <div className="fp-zone fp-corridor">
                <div className="fp-door-text-container">
                  <span className="fp-text">出入口</span>
                </div>
              </div>

              {/* SVG Lines for absolute precision walls & doors */}
              <svg className="fp-lines-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                <title>Floor Plan Lines</title>
                <g stroke="#475569" strokeWidth="0.3" fill="none">
                  {/* Outer border is handled by CSS, these are internal walls */}

                  {/* Vertical line: Blue/Green */}
                  <line x1="20" y1="40" x2="20" y2="85" />

                  {/* Horizontal line: Blue-Top / Green */}
                  <line x1="20" y1="40" x2="35" y2="40" />

                  {/* Vertical line: Blue-Top / 管理室 */}
                  <line x1="35" y1="0" x2="35" y2="40" />

                  {/* Horizontal line: 管理室 / Green */}
                  <line x1="35" y1="40" x2="55" y2="40" />

                  {/* Vertical line: 管理室 / Red */}
                  <line x1="55" y1="0" x2="55" y2="40" />

                  {/* Horizontal line: Red / Green&Yellow */}
                  <line x1="55" y1="40" x2="100" y2="40" />

                  {/* Vertical line: Green / Yellow & Corridor / Yellow */}
                  <line x1="80" y1="40" x2="80" y2="100" />

                  {/* Horizontal line: Blue&Green / Corridor (Left of doors) */}
                  <line x1="0" y1="85" x2="35" y2="85" />

                  {/* Horizontal line: Green / Corridor (Right of doors) */}
                  <line x1="65" y1="85" x2="80" y2="85" />

                  {/* --- Inner Partitions --- */}
                  {/* Red vertical */}
                  <line x1="75" y1="15" x2="75" y2="40" />
                  {/* Green horizontal */}
                  <line x1="20" y1="48" x2="30" y2="48" />
                  {/* Green vertical */}
                  <line x1="72" y1="65" x2="72" y2="85" />
                  {/* Yellow small horizontal tick */}
                  <line x1="96" y1="50" x2="100" y2="50" />

                  {/* --- Doors --- */}
                  {/* Left Door */}
                  <path d="M 35 85 L 35 92 L 40 85" strokeWidth="0.2" />
                  {/* Right Door */}
                  <path d="M 65 85 L 65 92 L 60 85" strokeWidth="0.2" />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
