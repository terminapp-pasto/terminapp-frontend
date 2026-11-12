import { useState } from "react";
import { getBusStyle } from "./buses";

type Props = {
  company: string;
  plate?: string;
  capacity?: number;
};

const WINDOW_POSITIONS = [34, 82, 130, 178, 226];
const WHEEL_POSITIONS = [72, 240];

// Shows the bus photo (shared by every company unless one has its own); if the file is missing, it draws an
// illustration in the company's color.
function BusImage({ company, plate, capacity }: Props) {
  const { color, photo } = getBusStyle(company);
  const [photoMissing, setPhotoMissing] = useState(!photo);

  return (
    <figure className="bus-image">
      {!photoMissing ? (
        <img src={photo} alt={`Bus de ${company}`} onError={() => setPhotoMissing(true)} />
      ) : (
        <svg viewBox="0 0 320 130" role="img" aria-label={`Ilustración del bus de ${company}`}>
          <ellipse cx="160" cy="118" rx="140" ry="8" fill="#0b1f3a" opacity="0.12" />
          {/* body */}
          <rect x="18" y="18" width="284" height="84" rx="16" fill={color} />
          <path d="M282 18h4a16 16 0 0 1 16 16v38h-20z" fill="#0b1f3a" opacity="0.25" />
          {/* company stripe */}
          <rect x="18" y="74" width="284" height="8" fill="#ffffff" opacity="0.85" />
          {/* windows */}
          {WINDOW_POSITIONS.map((x) => (
            <rect key={x} x={x} y="30" width="40" height="30" rx="5" fill="#dbeafe" />
          ))}
          <rect x="274" y="30" width="18" height="36" rx="4" fill="#dbeafe" />
          {/* door and lights */}
          <rect x="250" y="64" width="18" height="34" rx="3" fill="#0b1f3a" opacity="0.35" />
          <rect x="294" y="84" width="8" height="8" rx="2" fill="#ffd23f" />
          <rect x="18" y="84" width="6" height="8" rx="2" fill="#ef4444" />
          {/* wheels */}
          {WHEEL_POSITIONS.map((x) => (
            <g key={x}>
              <circle cx={x} cy="102" r="15" fill="#1f2937" />
              <circle cx={x} cy="102" r="6" fill="#9ca3af" />
            </g>
          ))}
          <text x="34" y="71" fontSize="10" fontWeight="700" fill="#ffffff" fontFamily="system-ui, sans-serif">
            {company}
          </text>
        </svg>
      )}
      <figcaption>
        <span>
          <strong>{company}</strong>
          {plate && <> · Placa {plate}</>}
          {capacity && <> · {capacity} puestos</>}
        </span>
        {/* the photo is the same for every company, so it is labeled as a reference */}
        <small>{photoMissing ? "Imagen ilustrativa" : "Foto de referencia"}</small>
      </figcaption>
    </figure>
  );
}

export default BusImage;
