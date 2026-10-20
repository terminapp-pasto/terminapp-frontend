import { useState } from "react";
import type { FormEvent } from "react";
import { API_URL, ERROR_CONEXION, mensajeDeError } from "./api";
import TarjetaSalida from "./TarjetaSalida";
import type { Salida } from "./tipos";

const DESTINOS = ["Ipiales", "Sandoná", "Tumaco", "Mocoa", "Cali", "Bogotá"];

type Estado = "inicio" | "cargando" | "error" | "listo";

function Buscador({ alComprar }: { alComprar: (salida: Salida) => void }) {
  const [destino, setDestino] = useState("Cali");
  const [desde, setDesde] = useState("00:00");
  const [ordenarPor, setOrdenarPor] = useState("hora");
  const [estado, setEstado] = useState<Estado>("inicio");
  const [salidas, setSalidas] = useState<Salida[]>([]);
  const [mensajeError, setMensajeError] = useState("");

  async function buscar(evento: FormEvent) {
    evento.preventDefault();
    setEstado("cargando");
    setMensajeError("");

    const parametros = new URLSearchParams({
      destino,
      desde,
      ordenar_por: ordenarPor,
    });

    try {
      const respuesta = await fetch(`${API_URL}/buscar?${parametros}`);
      const datos = await respuesta.json().catch(() => null);

      if (!respuesta.ok || !datos) {
        setMensajeError(
          mensajeDeError(datos, "El servidor respondió con un error.")
        );
        setEstado("error");
        return;
      }

      setSalidas(datos.salidas);
      setEstado("listo");
    } catch {
      setMensajeError(ERROR_CONEXION);
      setEstado("error");
    }
  }

  return (
    <>
      <form className="buscador" onSubmit={buscar}>
        <div className="campo">
          <label htmlFor="origen">Origen</label>
          <input id="origen" value="Pasto" disabled />
        </div>

        <div className="campo">
          <label htmlFor="destino">Destino</label>
          <select
            id="destino"
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
          >
            {DESTINOS.map((nombre) => (
              <option key={nombre} value={nombre}>
                {nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label htmlFor="desde">Salir desde</label>
          <input
            id="desde"
            type="time"
            value={desde}
            onChange={(e) => setDesde(e.target.value || "00:00")}
          />
        </div>

        <div className="campo">
          <label htmlFor="ordenar">Ordenar por</label>
          <select
            id="ordenar"
            value={ordenarPor}
            onChange={(e) => setOrdenarPor(e.target.value)}
          >
            <option value="hora">Hora de salida</option>
            <option value="precio">Precio más bajo</option>
          </select>
        </div>

        <button type="submit" disabled={estado === "cargando"}>
          {estado === "cargando" ? "Buscando..." : "Buscar pasajes"}
        </button>
      </form>

      {estado === "inicio" && (
        <p className="aviso">
          Elige tu destino y la hora desde la que quieres salir.
        </p>
      )}

      {estado === "cargando" && (
        <div className="aviso cargando">
          <span className="girador" aria-hidden="true"></span>
          Buscando salidas... La primera búsqueda puede tardar hasta un minuto
          mientras el servidor se activa.
        </div>
      )}

      {estado === "error" && (
        <div className="aviso error" role="alert">
          {mensajeError}
        </div>
      )}

      {estado === "listo" && salidas.length === 0 && (
        <p className="aviso">
          No hay salidas a {destino} desde las {desde}. Prueba con una hora más
          temprana.
        </p>
      )}

      {estado === "listo" && salidas.length > 0 && (
        <section>
          <h2 className="resumen">
            {salidas.length} {salidas.length === 1 ? "salida" : "salidas"} de
            Pasto a {destino}
          </h2>
          <ul className="resultados">
            {salidas.map((salida) => (
              <TarjetaSalida
                key={salida.horario_id}
                salida={salida}
                alComprar={alComprar}
              />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export default Buscador;
