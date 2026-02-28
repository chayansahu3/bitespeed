## Bitespeed Backend Task – Identity Reconciliation

Node.js + TypeScript + SQLite implementation of the Bitespeed identity reconciliation service with a dedicated reconciliation service layer.

### Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express
- **Database**: SQLite (via `better-sqlite3`)

### Project Structure

- `src/index.ts` – Server entrypoint (reads env, starts HTTP server)
- `src/server.ts` – Express app configuration
- `src/db.ts` – SQLite connection and schema initialization
- `src/models/contact.ts` – `Contact` model/type
- `src/repositories/contactRepository.ts` – Low-level DB access for contacts
- `src/services/identityService.ts` – **Identity reconciliation logic**
- `src/routes/identify.ts` – `/identify` HTTP endpoint

### Setup

```bash
cd bitespeed

# Install dependencies
npm install

# Development (auto-reload)
npm run dev

# Build & run
npm run build
npm start
```

Environment variables (optional):

- `PORT` – HTTP port (default: `3000`)
- `SQLITE_DB_PATH` – Path to the SQLite file (default: `./data/contacts.sqlite` in the project root)

### Database

On startup the app ensures a `contacts` table exists with the following schema:

- `id` – integer primary key (auto-increment)
- `phoneNumber` – string, nullable
- `email` – string, nullable
- `linkedId` – integer, nullable (points to primary contact)
- `linkPrecedence` – `"primary"` or `"secondary"`
- `createdAt`, `updatedAt` – ISO timestamp strings
- `deletedAt` – nullable ISO timestamp string

### `/identify` Endpoint

- **Method**: `POST`
- **Path**: `/identify`
- **Body (JSON)**:

```json
{
  "email": "mcfly@hillvalley.edu",
  "phoneNumber": "123456"
}
```

`email` and `phoneNumber` are both optional, but **at least one must be non-null/non-empty**.

#### Response

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

The response mirrors the specification:

- **`primaryContatctId`**: ID of the primary contact for this identity group.
- **`emails`**: All known unique emails for the group, with the primary contact's email first (when present).
- **`phoneNumbers`**: All known unique phone numbers for the group, with the primary contact's phone number first (when present).
- **`secondaryContactIds`**: IDs of all secondary contacts linked to the primary.

### Identity Reconciliation Rules (Implementation Summary)

- If there are **no existing contacts** matching the incoming `email` or `phoneNumber`, a **new primary contact** is created.
- If there **are existing contacts**, the service:
  - Finds all involved primary contacts and chooses the **oldest** (by `createdAt`) as the **canonical primary**.
  - Converts any other primary contacts into **secondary** contacts linked to the canonical primary, and re-links their secondaries to the canonical primary as well.
  - If the incoming request introduces a **new email or phoneNumber** not present in the merged group, it creates a **new secondary contact** with that new information, linked to the canonical primary.
  - Returns the consolidated group as per the required response format.

### Example Requests

Assuming the server is running on `http://localhost:3000`:

```bash
# New customer (creates primary)
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"lorraine@hillvalley.edu","phoneNumber":"123456"}'

# Same phone, new email (creates secondary)
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"mcfly@hillvalley.edu","phoneNumber":"123456"}'

# Lookup by phone only (no new contact)
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": null, "phoneNumber":"123456"}'
```

### Hosting

To host on a service like Render:

- Build the project (`npm run build`).
- Configure the start command as `npm start`.
- Make sure `PORT` is provided by the platform.
- Optionally set `SQLITE_DB_PATH` to a persistent disk location.

Once deployed, expose the deployed `/identify` URL in this README.

