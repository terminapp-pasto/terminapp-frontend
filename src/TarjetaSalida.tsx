import { formatoDuracion, formatoPrecio } from "./api";
import type { Salida } from "./tipos";

type Props = {
  salida: Salida;
  alComprar?: (salida: Salida) => void;
};

function TarjetaSalida({ salida, alComprar }: Props) {
  return (
    <li className="tarjeta">
      <div className="hora">{salida.hora_salida}</div>
      <div className="detalle">
        <strong>{salida.empresa}</strong>
        <span>
          {formatoDuracion(salida.duracion_min)} de viaje · bus de {salida.cupos}{" "}
          puestos
        </span>
      </div>
      <div className="precio-y-boton">
        <div className="precio">{formatoPrecio(salida.precio)}</div>
        {alComprar && (
          <button
            type="button"
            className="boton-comprar"
            onClick={() => alComprar(salida)}
          >
            Comprar
          </button>
        )}
      </div>
    </li>
  );
}

export default TarjetaSalida;
