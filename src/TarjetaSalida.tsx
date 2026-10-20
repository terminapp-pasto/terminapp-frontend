import { formatoDuracion, formatoPrecio } from "./api";
import type { Salida } from "./tipos";

function TarjetaSalida({ salida }: { salida: Salida }) {
  return (
    <li className="tarjeta">
      <div className="hora">{salida.hora_salida}</div>
      <div className="detalle">
        <strong>{salida.empresa}</strong>
        <span>
          {formatoDuracion(salida.duracion_min)} de viaje · {salida.cupos} cupos
        </span>
      </div>
      <div className="precio">{formatoPrecio(salida.precio)}</div>
    </li>
  );
}

export default TarjetaSalida;
