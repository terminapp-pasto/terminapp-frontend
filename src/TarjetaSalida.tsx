import { formatoDuracion, formatoFecha, formatoPrecio } from "./api";
import type { Salida } from "./tipos";

type Props = {
  salida: Salida;
  alComprar?: (salida: Salida) => void;
};

function TarjetaSalida({ salida, alComprar }: Props) {
  const agotado = salida.cupos <= 0;
  return (
    <li className={`tarjeta${agotado ? " agotada" : ""}`}>
      <div className="hora">
        {salida.hora_salida}
        {salida.fecha && <small>{formatoFecha(salida.fecha)}</small>}
      </div>
      <div className="detalle">
        <strong>{salida.empresa}</strong>
        <span>
          {formatoDuracion(salida.duracion_min)} de viaje ·{" "}
          {agotado
            ? "sin cupos"
            : `${salida.cupos} ${salida.cupos === 1 ? "cupo libre" : "cupos libres"}`}
        </span>
      </div>
      <div className="precio-y-boton">
        <div className="precio">{formatoPrecio(salida.precio)}</div>
        {alComprar && (
          <button
            type="button"
            className="boton-comprar"
            onClick={() => alComprar(salida)}
            disabled={agotado}
          >
            {agotado ? "Agotado" : "Comprar"}
          </button>
        )}
      </div>
    </li>
  );
}

export default TarjetaSalida;
