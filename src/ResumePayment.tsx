import { useState } from "react";
import Countdown from "./Countdown";
import ScreenShell from "./ScreenShell";
import EmbeddedPayment from "./EmbeddedPayment";

type Props = {
  paymentId: number;
  token: string;
  onClose: () => void;
  onSessionExpired: () => void;
  onAlreadyPaid: () => void;
};

// Full page to finish paying a purchase left pending in "Mis viajes".
// It reuses the open Stripe payment instead of creating a new one.
function ResumePayment({ paymentId, token, onClose, onSessionExpired, onAlreadyPaid }: Props) {
  const [deadline, setDeadline] = useState<string | null>(null);

  return (
    <ScreenShell
      titleId="resume-title"
      title="Terminar el pago"
      subtitle={`Compra #${paymentId}`}
      backLabel="Mis viajes"
      onBack={onClose}
    >
      <div className="screen-page">
        <div className="screen-card">
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
    </ScreenShell>
  );
}

export default ResumePayment;
