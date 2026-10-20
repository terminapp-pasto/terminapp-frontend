import { IconoAsiento, IconoChat, IconoTarjeta } from "./Iconos";

const PASOS = [
  {
    icono: <IconoChat tamano={26} />,
    titulo: "Cuéntale a dónde vas",
    texto: "Escribe como hablas: “quiero ir a Sandoná el sábado temprano”. La IA busca las salidas reales.",
  },
  {
    icono: <IconoAsiento tamano={26} />,
    titulo: "Elige tu asiento",
    texto: "Mira el bus por dentro, escoge hasta 5 puestos y escribe los datos del pasajero.",
  },
  {
    icono: <IconoTarjeta tamano={26} />,
    titulo: "Paga y viaja",
    texto: "Pagas en línea y tu tiquete queda guardado en tu cuenta, listo para mostrar.",
  },
];

function ComoFunciona() {
  return (
    <section className="como-funciona" aria-labelledby="titulo-como-funciona">
      <h2 id="titulo-como-funciona">Así de fácil</h2>
      <ol>
        {PASOS.map((paso, i) => (
          <li key={paso.titulo}>
            <span className="paso-icono">{paso.icono}</span>
            <span className="paso-numero">Paso {i + 1}</span>
            <strong>{paso.titulo}</strong>
            <p>{paso.texto}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default ComoFunciona;
