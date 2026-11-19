import { useEffect, useRef, useState } from "react";
import { ROLE_LABELS } from "./adminApi";
import { BusIcon, ChevronDownIcon, LogoutIcon, TicketIcon } from "./Icons";
import type { Session } from "./session";

type Props = {
  session: Session;
  showPanel: boolean;
  onNavigate: (section: "account" | "panel") => void;
  onLogout: () => void;
};

// Profile button in the top bar: shows who is logged in, with which role, and
// lets them log out from any section (before, it was only inside Mis viajes).
function AccountMenu({ session, showPanel, onNavigate, onLogout }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user } = session;
  const role = user.role ?? "user";
  const firstName = user.name.split(" ")[0];
  const roleLabel = role === "company" && user.company ? `${ROLE_LABELS.company} · ${user.company}` : ROLE_LABELS[role];

  // Closes with Escape or a click anywhere outside the menu
  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function choose(action: () => void) {
    setIsOpen(false);
    action();
  }

  return (
    <div className="account-menu" ref={menuRef}>
      <button
        type="button"
        className="account-menu-button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Cuenta de ${firstName} (${roleLabel})`}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="account-avatar" aria-hidden="true">
          {firstName.charAt(0).toUpperCase()}
        </span>
        <span className="account-menu-name">{firstName}</span>
        <ChevronDownIcon size={16} />
      </button>

      {isOpen && (
        <div className="account-menu-list" role="menu">
          <div className="account-menu-who">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
            <span className={`role-badge ${role}`}>{roleLabel}</span>
          </div>
          <button type="button" role="menuitem" onClick={() => choose(() => onNavigate("account"))}>
            <TicketIcon size={18} /> Mis viajes
          </button>
          {showPanel && (
            <button type="button" role="menuitem" onClick={() => choose(() => onNavigate("panel"))}>
              <BusIcon size={18} /> {role === "admin" ? "Panel de administración" : "Panel de mi empresa"}
            </button>
          )}
          <button type="button" role="menuitem" className="logout-item" onClick={() => choose(onLogout)}>
            <LogoutIcon size={18} /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

export default AccountMenu;
