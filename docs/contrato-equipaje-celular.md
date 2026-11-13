# Contrato: equipaje y celular en la compra

El frontend (rama `ajustes-frontend`) ya manda estos datos en `POST /purchases`.
Hoy el backend los ignora (Pydantic descarta campos desconocidos), así que no rompe nada.
Falta que el backend (Juan David) los guarde y los devuelva.

## Lo que envía el frontend

```json
POST /purchases
{
  "schedule_id": 1,
  "date": "2026-11-14",
  "contact_phone": "3001234567",
  "passengers": [
    { "seat": 7, "name": "Felipe Cerón", "document_type": "CC", "document": "1085123456", "checked_bags": 1 },
    { "seat": 8, "name": "Juan David Pérez", "document_type": "CC", "document": "1085654321", "checked_bags": 0 }
  ]
}
```

- `contact_phone`: celular colombiano, 10 dígitos que empiezan por 3, sin +57. Regla: `^3\d{9}$`. Obligatorio.
- `checked_bags`: maletas en bodega por pasajero, entero de 0 a 2 (hasta 20 kg cada una).
  El bolso de mano (hasta 8 kg) siempre va incluido y no se envía.
- Por ahora el equipaje no tiene precio. Si cada empresa le pone precio después, conviene
  devolverlo en el mapa de asientos (`GET /schedules/{id}/seats`) para que el resumen lo muestre.

## Lo que el frontend espera de vuelta (opcional, ya lo lee si llega)

`GET /my-tickets`, en cada compra:

```json
{ "contact_phone": "3001234567", "tickets": [ { "seat": 7, "checked_bags": 1, "...": "..." } ] }
```

- Si llega `contact_phone`, el botón "Enviar itinerario a mi WhatsApp" abre el chat con ese número.
  Si no llega, usa el último celular escrito en ese navegador, y si no hay, WhatsApp pregunta a quién enviarlo.

## Sugerencia para la base de datos

- `payments.contact_phone VARCHAR(10)`
- `tickets.checked_bags SMALLINT NOT NULL DEFAULT 0 CHECK (checked_bags BETWEEN 0 AND 2)`
