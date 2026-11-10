import { formatDuration, formatPrice, formatShortDate } from "./api";
import type { Departure } from "./types";

type Props = {
  departure: Departure;
  onBuy?: (departure: Departure) => void;
};

function DepartureCard({ departure, onBuy }: Props) {
  const soldOut = departure.available_seats <= 0;
  const seatsText =
    departure.available_seats === 1 ? "1 cupo libre" : `${departure.available_seats} cupos libres`;

  return (
    <li className={`card${soldOut ? " sold-out" : ""}`}>
      <div className="time">
        {departure.departure_time}
        {departure.date && <small>{formatShortDate(departure.date)}</small>}
      </div>
      <div className="details">
        <strong>{departure.company}</strong>
        <span>
          {formatDuration(departure.duration_min)} de viaje · {soldOut ? "sin cupos" : seatsText}
        </span>
      </div>
      <div className="price-and-button">
        <div className="price">{formatPrice(departure.price)}</div>
        {onBuy && (
          <button
            type="button"
            className="buy-button"
            onClick={() => onBuy(departure)}
            disabled={soldOut}
          >
            {soldOut ? "Agotado" : "Comprar"}
          </button>
        )}
      </div>
    </li>
  );
}

export default DepartureCard;
