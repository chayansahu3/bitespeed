export type LinkPrecedence = 'primary' | 'secondary';

export interface Contact {
  id: number;
  phoneNumber: string | null;
  email: string | null;
  linkedId: number | null; // the ID of another Contact linked to this one
  linkPrecedence: LinkPrecedence; // "primary" if it's the first Contact in the link
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  deletedAt: string | null; // ISO string
}

