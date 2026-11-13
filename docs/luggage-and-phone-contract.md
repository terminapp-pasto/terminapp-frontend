# Contract: luggage and contact phone in a purchase

> **Status (2026-11-13):** implemented in the backend (`db/09_roles_and_settings.sql`).
> The backend stores `contact_phone` and `checked_bags` and returns them in `/my-tickets`.

## What the frontend sends

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

- `contact_phone`: Colombian mobile number, 10 digits starting with 3, without +57. Rule: `^3\d{9}$`. Required.
- `checked_bags`: bags in the hold per passenger, an integer from 0 to 2 (up to 20 kg each).
  The carry-on bag (up to 8 kg) is always included and is not sent.
- Luggage has no price for now. If companies price it later, the seat map
  (`GET /schedules/{id}/seats`) should return the price so the summary can show it.
- Each document can appear only once per purchase; the backend rejects duplicates.

## What the frontend reads back

`GET /my-tickets`, in each purchase:

```json
{ "contact_phone": "3001234567", "tickets": [ { "seat": 7, "checked_bags": 1, "...": "..." } ] }
```

- With `contact_phone`, the "Enviar itinerario a mi WhatsApp" button opens the chat with that number.
  Without it, the button uses the last number typed in that browser; if there is none,
  WhatsApp asks who to send it to.

## Database

- `payments.contact_phone VARCHAR(10)`
- `tickets.checked_bags SMALLINT NOT NULL DEFAULT 0 CHECK (checked_bags BETWEEN 0 AND 2)`
