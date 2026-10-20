// Tipos de datos que devuelve el backend.

export type Salida = {
  horario_id: number;
  empresa: string;
  origen: string;
  destino: string;
  hora_salida: string;
  duracion_min: number;
  precio: number;
  cupos: number;
};

export type Rol = "usuario" | "asistente";

export type MensajeChat = {
  rol: Rol;
  texto: string;
  salidas?: Salida[];
};
