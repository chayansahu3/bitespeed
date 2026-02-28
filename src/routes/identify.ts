import { Router } from 'express';
import { identifyContact } from '../services/identityService';

export const identifyRouter = Router();

identifyRouter.post('/', (req, res) => {
  try {
    const { email = null, phoneNumber = null } = req.body ?? {};

    const result = identifyContact({ email, phoneNumber });

    res.status(200).json(result);
  } catch (err: any) {
    if (err instanceof Error && err.message.includes('At least one of email or phoneNumber')) {
      return res.status(400).json({ error: err.message });
    }

    console.error('Error in /identify:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

