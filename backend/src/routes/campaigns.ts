import { Router } from 'express';
import { Campaign } from '../models/Campaign';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', async (req, res) => {
  try {
    const campaign = await Campaign.create({
      ...req.body,
      clientId: req.user!.clientId,
    });
    res.status(201).json(campaign);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get('/', async (req, res) => {
  const filter = req.user!.role === 'admin' ? {} : { clientId: req.user!.clientId ?? null };
  const campaigns = await Campaign.find(filter);
  res.json(campaigns);
});

export default router;
