// Tipos de datos que devuelve el backend.

export type Salida = {
  horario_id: number;
  empresa: string;
  origen: string;
  destino: string;
  hora_salida: string;
  duracion_min: number;
  precio: number;
  cupos: number; // cupos libres ese día
  fecha?: string; // AAAA-MM-DD
};

export type EstadoAsiento = "LIBRE" | "OCUPADO";

export type MapaAsientos = {
  salida: Salida & { capacidad: number; placa?: string };
  fecha: string;
  libres: number;
  asientos: { numero: number; estado: EstadoAsiento }[];
};

export type Reserva = {
  pago_id: number;
  estado: string;
  total: number;
  asientos: number[];
  vence: string;
};

export type Tiquete = {
  tiquete_id: number;
  pago_id: number;
  estado: "RESERVADO" | "PAGANDO" | "PAGADO" | "CANCELADO" | "VENCIDO";
  fecha: string;
  hora_salida: string;
  empresa: string;
  origen: string;
  destino: string;
  asiento: number;
  pasajero: string;
  documento: string;
  precio: number;
  vence: string | null; // hora hasta la que se guarda una reserva sin pagar
};

export type Rol = "usuario" | "asistente";

export type MensajeChat = {
  rol: Rol;
  texto: string;
  salidas?: Salida[];
};
