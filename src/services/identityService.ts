import { Contact } from '../models/contact';
import {
  createContact,
  findContactsByEmailOrPhone,
  findContactsByPrimaryId,
  relinkSecondaries,
  updateContactToSecondary,
} from '../repositories/contactRepository';
import { getDb } from '../db';

export interface IdentifyRequestBody {
  email?: string | null;
  phoneNumber?: string | null;
}

export interface IdentifyResponseContact {
  primaryContatctId: number;
  emails: string[];
  phoneNumbers: string[];
  secondaryContactIds: number[];
}

export interface IdentifyResponse {
  contact: IdentifyResponseContact;
}

function normalizeEmail(email?: string | null): string | null {
  if (!email) return null;
  const trimmed = email.trim();
  return trimmed === '' ? null : trimmed.toLowerCase();
}

function normalizePhone(phone?: string | null): string | null {
  if (!phone) return null;
  const trimmed = String(phone).trim();
  return trimmed === '' ? null : trimmed;
}

export function identifyContact(input: IdentifyRequestBody): IdentifyResponse {
  const email = normalizeEmail(input.email ?? null);
  const phoneNumber = normalizePhone(input.phoneNumber ?? null);

  if (!email && !phoneNumber) {
    throw new Error('At least one of email or phoneNumber must be provided');
  }

  const db = getDb();

  const existingMatches = findContactsByEmailOrPhone(email, phoneNumber);

  if (existingMatches.length === 0) {
    // No existing contacts: create a new primary
    const primary = createContact({
      email,
      phoneNumber,
      linkedId: null,
      linkPrecedence: 'primary',
    });

    return buildResponseFromContacts(primary.id, [primary]);
  }

  // There are existing contacts – ensure there is exactly one primary group
  const transaction = db.transaction(() => {
    // Determine all primary IDs involved in the matches
    const primaryIds = new Set<number>();

    for (const c of existingMatches) {
      if (c.linkPrecedence === 'primary') {
        primaryIds.add(c.id);
      } else if (c.linkedId != null) {
        primaryIds.add(c.linkedId);
      }
    }

    // If somehow none were marked primary (shouldn't happen), treat the oldest as primary
    if (primaryIds.size === 0) {
      const sorted = [...existingMatches].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      primaryIds.add(sorted[0].id);
    }

    const primaryIdList = [...primaryIds];

    // Choose the canonical primary: oldest createdAt among all involved primaries
    let canonicalPrimary: Contact | null = null;
    const allPrimaries: Contact[] = [];

    for (const pid of primaryIdList) {
      const groupContacts = findContactsByPrimaryId(pid);
      const primaryInGroup = groupContacts.find((c) => c.id === pid);
      if (primaryInGroup) {
        allPrimaries.push(primaryInGroup);
      }
    }

    if (allPrimaries.length === 0) {
      // Fallback safety: choose oldest from all matches
      canonicalPrimary = [...existingMatches].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
    } else {
      canonicalPrimary = [...allPrimaries].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
    }

    const canonicalPrimaryId = canonicalPrimary.id;

    // Merge other primaries (if any) into canonical primary
    for (const otherPrimary of allPrimaries) {
      if (otherPrimary.id === canonicalPrimaryId) continue;

      // Turn other primary into secondary of canonical, and re-link its secondaries
      updateContactToSecondary(otherPrimary.id, canonicalPrimaryId);
      relinkSecondaries(otherPrimary.id, canonicalPrimaryId);
    }

    // Now, fetch all contacts belonging to the canonical primary
    let groupContacts = findContactsByPrimaryId(canonicalPrimaryId);

    // Decide whether to create a new secondary for new information
    const emailsInGroup = new Set(groupContacts.map((c) => c.email).filter((e): e is string => !!e));
    const phonesInGroup = new Set(groupContacts.map((c) => c.phoneNumber).filter((p): p is string => !!p));

    const hasNewEmail = !!email && !emailsInGroup.has(email);
    const hasNewPhone = !!phoneNumber && !phonesInGroup.has(phoneNumber);

    if (hasNewEmail || hasNewPhone) {
      const newSecondary = createContact({
        email,
        phoneNumber,
        linkedId: canonicalPrimaryId,
        linkPrecedence: 'secondary',
      });
      groupContacts = [...groupContacts, newSecondary];
    }

    return buildResponseFromContacts(canonicalPrimaryId, groupContacts);
  });

  return transaction();
}

function buildResponseFromContacts(primaryId: number, contacts: Contact[]): IdentifyResponse {
  const primary = contacts.find((c) => c.id === primaryId);

  const emailsSet = new Set<string>();
  const phonesSet = new Set<string>();
  const secondaryIds: number[] = [];

  // Ensure primary's email/phone are first in the arrays, as per spec
  if (primary?.email) {
    emailsSet.add(primary.email);
  }
  if (primary?.phoneNumber) {
    phonesSet.add(primary.phoneNumber);
  }

  for (const c of contacts) {
    if (c.id !== primaryId) {
      if (c.email) emailsSet.add(c.email);
      if (c.phoneNumber) phonesSet.add(c.phoneNumber);
    }
    if (c.id !== primaryId && c.linkPrecedence === 'secondary') {
      secondaryIds.push(c.id);
    }
  }

  return {
    contact: {
      primaryContatctId: primaryId,
      emails: Array.from(emailsSet),
      phoneNumbers: Array.from(phonesSet),
      secondaryContactIds: secondaryIds,
    },
  };
}

