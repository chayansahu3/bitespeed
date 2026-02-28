# Bitespeed – Identity Reconciliation

Backend for the Bitespeed identity reconciliation task. Tracks contacts by email/phone and links them so one customer can have multiple contact rows (oldest = primary, rest = secondary). Built with Node, TypeScript, Express, and SQLite.

## Run locally

```bash
npm install
npm run dev
```

Defaults to port 3000. For production: `npm run build` then `npm start`. Env vars: `PORT`, `SQLITE_DB_PATH` (defaults to `./data/contacts.sqlite`).

## API

**POST /identify**

Send JSON body with at least one of `email` or `phoneNumber`:

```json
{
  "email": "mcfly@hillvalley.edu",
  "phoneNumber": "123456"
}
```

You get back the consolidated contact for that identity:

```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [23]
  }
}
```

(Note: `primaryContatctId` is spelled that way in the spec.)

## How it works

- No match for email or phone → create a new primary contact.
- Match found → we figure out the primary (oldest by `createdAt`), merge any other primaries into that one (they become secondary), and if the request has a new email or phone we haven’t seen, we create a secondary for it. Response is always the full group: primary id, all emails, all phone numbers, secondary ids.

## Try it

```bash
# New customer
curl -X POST http://localhost:3000/identify -H "Content-Type: application/json" -d '{"email":"lorraine@hillvalley.edu","phoneNumber":"123456"}'

# Same phone, new email (adds secondary)
curl -X POST http://localhost:3000/identify -H "Content-Type: application/json" -d '{"email":"mcfly@hillvalley.edu","phoneNumber":"123456"}'
```

## Repo layout

- `src/services/identityService.ts` – reconciliation logic
- `src/repositories/contactRepository.ts` – DB access
- `src/routes/identify.ts` – POST /identify handler
- `src/db.ts` – SQLite + table creation

## Deploy (e.g. Render)

Build: `npm install && npm run build`  
Start: `npm start`  
Set `SQLITE_DB_PATH` to a persistent disk path if you want the DB to survive restarts.
