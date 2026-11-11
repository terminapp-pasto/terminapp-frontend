import { useEffect, useRef, useState } from "react";
import { ApiError, apiRequest, errorText } from "./api";
import { mountEmbeddedCheckout, removeEmbeddedCheckout } from "./stripe";
import type { EmbeddedCheckout } from "./stripe";
import type { PaymentSession } from "./types";

type Props = {
  paymentId: number;
  token: string;
  onSessionExpired: () => void;
  onAlreadyPaid: () => void;
};

const DEFAULT_UI_MODE = "embedded";

// Asks the backend for a purchase's payment and draws the Stripe form right
// here. If the purchase already had an open payment, the backend reuses it, so
// two payments are never created for the same purchase.
function EmbeddedPayment({ paymentId, token, onSessionExpired, onAlreadyPaid }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    let checkout: EmbeddedCheckout | null = null;

    async function startPayment() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const session = await apiRequest<PaymentSession>(`/purchases/${paymentId}/pay`, {
          method: "POST",
          token,
        });
        if (!isCurrent) return;
        if (!session.client_secret) {
          onAlreadyPaid(); // Stripe already had this payment as approved
          return;
        }
        const mounted = await mountEmbeddedCheckout(
          session.client_secret,
          session.ui_mode ?? DEFAULT_UI_MODE,
          containerRef.current!
        );
        if (!isCurrent) {
          removeEmbeddedCheckout(mounted); // the user closed the window while it was loading
          return;
        }
        checkout = mounted;
        setIsLoading(false);
      } catch (error) {
        if (!isCurrent) return;
        if (error instanceof ApiError && error.status === 401) {
          onSessionExpired();
          return;
        }
        setErrorMessage(error instanceof ApiError ? errorText(error) : (error as Error).message);
        setIsLoading(false);
      }
    }

    startPayment();
    return () => {
      isCurrent = false;
      removeEmbeddedCheckout(checkout);
    };
  }, [paymentId, token, attempt, onSessionExpired, onAlreadyPaid]);

  return (
    <div className="embedded-payment">
      {isLoading && (
        <div className="notice loading">
          <span className="spinner" aria-hidden="true"></span>
          Preparando el pago seguro...
        </div>
      )}
      {errorMessage && (
        <div className="notice error" role="alert">
          {errorMessage}{" "}
          <button type="button" className="text-button" onClick={() => setAttempt((n) => n + 1)}>
            Reintentar
          </button>
        </div>
      )}
      <div ref={containerRef} className="stripe-container" />
      <p className="note">
        Pago de prueba: usa la tarjeta 4242 4242 4242 4242, cualquier fecha futura y cualquier CVC.
      </p>
    </div>
  );
}

export default EmbeddedPayment;
