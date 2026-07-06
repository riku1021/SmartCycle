import type { FC } from "react";
import { FaLocationCrosshairs } from "react-icons/fa6";

type NavRecenterButtonProps = {
  visible: boolean;
  onClick: () => void;
};

export const NavRecenterButton: FC<NavRecenterButtonProps> = ({ visible, onClick }) => {
  if (!visible) return null;

  return (
    <button
      type="button"
      className="nav-recenter-btn"
      onClick={onClick}
      aria-label="現在地に戻る"
      title="現在地に戻る"
    >
      <FaLocationCrosshairs />
    </button>
  );
};
