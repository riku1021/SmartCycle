import type { FC } from "react";

type AppHeaderProps = {
  title: string;
  subtitle: string;
  hidden?: boolean;
};

const AppHeader: FC<AppHeaderProps> = ({ title, subtitle, hidden = false }) => {
  return (
    <header className={`app-header${hidden ? " hidden" : ""}`}>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
  );
};

export default AppHeader;
