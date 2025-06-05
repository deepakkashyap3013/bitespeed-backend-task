import { Router } from 'express';
import { identifyContact } from '../controllers/indentity.controller';

const router = Router();

router.post('/identify', identifyContact);

export default router;

