import { useEffect, useState } from "react";
import Countdown from "./Countdown";
import EmbeddedPayment from "./EmbeddedPayment";

type Props = {
  paymentId: number;
  token: string;
  onClose: () => void;
  onSessionExpired: () => void;
  onAlreadyPaid: () => void;
};

// Window to finish paying a purchase left pending in "Mis viajes".
// It reuses the open Stripe payment instead of creating a new one.
function ResumePayment({ paymentId, token, onClose, onSessionExpired, onAlreadyPaid }: Props) {
  const [deadline, setDeadline] = useState<string | null>(null);

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
    // a click on the dark background does not close it: that would interrupt the payment
    <div className="checkout-backdrop">
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
          {deadline && <Countdown deadline={deadline} />}
          <EmbeddedPayment
            paymentId={paymentId}
            token={token}
            onSessionExpired={onSessionExpired}
            onAlreadyPaid={onAlreadyPaid}
            onDeadline={setDeadline}
          />
        </div>
      </div>
    </div>
  );
}

export default ResumePayment;
