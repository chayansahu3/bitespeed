import { getDb } from '../db';
import { Contact, LinkPrecedence } from '../models/contact';

export function findContactsByEmailOrPhone(email?: string | null, phoneNumber?: string | null): Contact[] {
  const db = getDb();

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (email) {
    conditions.push('email = ?');
    params.push(email);
  }
  if (phoneNumber) {
    conditions.push('phoneNumber = ?');
    params.push(phoneNumber);
  }

  if (conditions.length === 0) {
    return [];
  }

  const whereClause = conditions.join(' OR ');

  const stmt = db.prepare<Contact>(`
    SELECT id, phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt, deletedAt
    FROM contacts
    WHERE (${whereClause}) AND (deletedAt IS NULL)
  `);

  return stmt.all(...params);
}

export function findContactsByPrimaryId(primaryId: number): Contact[] {
  const db = getDb();
  const stmt = db.prepare<Contact>(`
    SELECT id, phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt, deletedAt
    FROM contacts
    WHERE (id = ? OR linkedId = ?) AND (deletedAt IS NULL)
  `);
  return stmt.all(primaryId, primaryId);
}

export function createContact(data: {
  email: string | null;
  phoneNumber: string | null;
  linkedId: number | null;
  linkPrecedence: LinkPrecedence;
}): Contact {
  const db = getDb();
  const now = new Date().toISOString();

  const stmt = db.prepare<unknown>(`
    INSERT INTO contacts (email, phoneNumber, linkedId, linkPrecedence, createdAt, updatedAt, deletedAt)
    VALUES (?, ?, ?, ?, ?, ?, NULL)
  `);

  const result = stmt.run(data.email, data.phoneNumber, data.linkedId, data.linkPrecedence, now, now);

  const id = Number(result.lastInsertRowid);

  const selectStmt = db.prepare<Contact>(`
    SELECT id, phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt, deletedAt
    FROM contacts
    WHERE id = ?
  `);

  return selectStmt.get(id)!;
}

export function updateContactToSecondary(contactId: number, newPrimaryId: number): void {
  const db = getDb();
  const now = new Date().toISOString();

  const stmt = db.prepare<unknown>(`
    UPDATE contacts
    SET linkPrecedence = 'secondary',
        linkedId = ?,
        updatedAt = ?
    WHERE id = ?
  `);

  stmt.run(newPrimaryId, now, contactId);
}

export function relinkSecondaries(oldPrimaryId: number, newPrimaryId: number): void {
  const db = getDb();
  const now = new Date().toISOString();

  const stmt = db.prepare<unknown>(`
    UPDATE contacts
    SET linkedId = ?,
        updatedAt = ?
    WHERE linkedId = ?
  `);

  stmt.run(newPrimaryId, now, oldPrimaryId);
}

