import { useEffect } from "react";
import EmbeddedPayment from "./EmbeddedPayment";

type Props = {
  paymentId: number;
  token: string;
  onClose: () => void;
  onSessionExpired: () => void;
  onAlreadyPaid: () => void;
};

// Ventana para terminar el pago de una compra que quedó pendiente en "Mis viajes".
// Reutiliza el pago abierto en Stripe, no crea uno nuevo.
function ResumePayment({ paymentId, token, onClose, onSessionExpired, onAlreadyPaid }: Props) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className="checkout-backdrop" onClick={onClose}>
      <div
        className="checkout narrow"
        role="dialog"
        aria-modal="true"
        aria-labelledby="resume-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="checkout-header">
          <div>
            <h2 id="resume-title">Terminar el pago</h2>
            <p>Compra #{paymentId}</p>
          </div>
          <button type="button" className="close-button" onClick={onClose} aria-label="Cerrar (Esc)">
            ×
          </button>
        </header>
        <div className="checkout-main">
          <EmbeddedPayment
            paymentId={paymentId}
            token={token}
            onSessionExpired={onSessionExpired}
            onAlreadyPaid={onAlreadyPaid}
          />
        </div>
      </div>
    </div>
  );
}

export default ResumePayment;
