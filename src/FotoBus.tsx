import { useState } from "react";
import { datosDelBus } from "./buses";

type Props = {
  empresa: string;
  placa?: string;
  capacidad?: number;
};

// Muestra la foto del bus de la empresa; si la foto no existe todavía,
// dibuja una ilustración con el color de la empresa.
function FotoBus({ empresa, placa, capacidad }: Props) {
  const { color, foto } = datosDelBus(empresa);
  const [sinFoto, setSinFoto] = useState(!foto);

  return (
    <figure className="foto-bus">
      {!sinFoto ? (
        <img src={foto} alt={`Bus de ${empresa}`} onError={() => setSinFoto(true)} />
      ) : (
        <svg viewBox="0 0 320 130" role="img" aria-label={`Ilustración del bus de ${empresa}`}>
          <ellipse cx="160" cy="118" rx="140" ry="8" fill="#0b1f3a" opacity="0.12" />
          {/* carrocería */}
          <rect x="18" y="18" width="284" height="84" rx="16" fill={color} />
          <path d="M282 18h4a16 16 0 0 1 16 16v38h-20z" fill="#0b1f3a" opacity="0.25" />
          {/* franja de la empresa */}
          <rect x="18" y="74" width="284" height="8" fill="#ffffff" opacity="0.85" />
          {/* ventanas */}
          {[34, 82, 130, 178, 226].map((x) => (
            <rect key={x} x={x} y="30" width="40" height="30" rx="5" fill="#dbeafe" />
          ))}
          <rect x="274" y="30" width="18" height="36" rx="4" fill="#dbeafe" />
          {/* puerta y luces */}
          <rect x="250" y="64" width="18" height="34" rx="3" fill="#0b1f3a" opacity="0.35" />
          <rect x="294" y="84" width="8" height="8" rx="2" fill="#ffd23f" />
          <rect x="18" y="84" width="6" height="8" rx="2" fill="#ef4444" />
          {/* ruedas */}
          {[72, 240].map((x) => (
            <g key={x}>
              <circle cx={x} cy="102" r="15" fill="#1f2937" />
              <circle cx={x} cy="102" r="6" fill="#9ca3af" />
            </g>
          ))}
          <text x="34" y="71" fontSize="10" fontWeight="700" fill="#ffffff" fontFamily="system-ui, sans-serif">
            {empresa}
          </text>
        </svg>
      )}
      <figcaption>
        <span>
          <strong>{empresa}</strong>
          {placa && <> · Placa {placa}</>}
          {capacidad && <> · {capacidad} puestos</>}
        </span>
        {sinFoto && <small>Imagen ilustrativa</small>}
      </figcaption>
    </figure>
  );
}

export default FotoBus;
