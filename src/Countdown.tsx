import { useEffect, useState } from "react";
import { ClockIcon } from "./Icons";

const SECOND = 1000;

function remainingSeconds(deadline: string, now: number) {
  return Math.max(0, Math.floor((new Date(deadline).getTime() - now) / SECOND));
}

function formatMinutesAndSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

// Live countdown until the seats are released, e.g. "Tus asientos están apartados por 14:32".
function Countdown({ deadline }: { deadline: string }) {
  // only "now" is state; the seconds left are computed from it, so a new deadline shows at once
  const [now, setNow] = useState(() => Date.now());
  const secondsLeft = remainingSeconds(deadline, now);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), SECOND);
    return () => clearInterval(timer);
  }, []);

  if (secondsLeft === 0) {
    return (
      <p className="countdown expired" role="status">
        <ClockIcon size={16} /> Se acabó el tiempo para pagar y los asientos se liberaron.
      </p>
    );
  }
  const isUrgent = secondsLeft < 5 * 60;
  return (
    <p className={`countdown${isUrgent ? " urgent" : ""}`} role="timer" aria-live="off">
      <ClockIcon size={16} /> Tus asientos están apartados por <b>{formatMinutesAndSeconds(secondsLeft)}</b>
    </p>
  );
}

export default Countdown;
