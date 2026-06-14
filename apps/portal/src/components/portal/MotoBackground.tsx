import { DEFAULT_BACKGROUND_URL } from "../../lib/branding";

export default function MotoBackground({ children }: { children?: React.ReactNode }) {
  return (
    <div className="portal-bg min-h-screen relative">
      <div
        className="portal-bg__image"
        style={{ backgroundImage: `url("${encodeURI(DEFAULT_BACKGROUND_URL)}")` }}
        aria-hidden
      />
      <div className="portal-bg__overlay" aria-hidden />
      <div className="relative z-10 min-h-screen">{children}</div>
    </div>
  );
}
