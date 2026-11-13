import { useEffect } from "react";
import type { ReactNode } from "react";
import { ArrowLeftIcon } from "./Icons";
import Logo from "./Logo";

type Props = {
  titleId: string;
  title: ReactNode;
  subtitle?: ReactNode;
  backLabel: string;
  onBack: () => void;
  // "light" for the purchase steps, "dark" for the immersive login page
  tone?: "light" | "dark";
  // what the header shows on the right (e.g. the trip price)
  aside?: ReactNode;
  children: ReactNode;
};

// A full-screen page over the app, for long flows like buying or logging in. It is
// not a floating window: it covers the whole screen, has a "Volver" button on the
// left (like an app) and nothing behind it can be clicked by accident.
function ScreenShell({ titleId, title, subtitle, backLabel, onBack, tone = "light", aside, children }: Props) {
  // The page behind does not scroll, and the new page starts at the top.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Escape works like the "Volver" button (each screen decides if it asks first).
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onBack();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onBack]);

  return (
    <div className={`screen ${tone}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header className="screen-header">
        <button type="button" className="screen-back" onClick={onBack}>
          <ArrowLeftIcon size={18} />
          <span>{backLabel}</span>
        </button>
        <div className="screen-title">
          <h2 id={titleId}>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="screen-aside">{aside ?? <Logo size={28} />}</div>
      </header>
      <div className="screen-body">{children}</div>
    </div>
  );
}

export default ScreenShell;
