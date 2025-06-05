import { Request, Response } from 'express';
import { IdentityService } from '../services/identity.service';
import { IdentifyRequest } from '../types/identity.types';

const identityService = new IdentityService();

export const identifyContact = async (req: Request, res: Response) => {
    const payload: IdentifyRequest = req.body;

    /**
     * Validate the request body
     */
    if (payload.phoneNumber && typeof payload.phoneNumber !== 'string' && typeof payload.phoneNumber !== 'number') {
        return res.status(400).json({ error: "phoneNumber must be a string or number" });
    }

    if (payload.email && typeof payload.email !== 'string') {
        return res.status(400).json({ error: "email must be a string" });
    }

    if (!payload.email && !payload.phoneNumber) {
        return res.status(400).json({ error: "Either email or phoneNumber must be provided." });
    }

    // All good, call the service
    try {
        const result = await identityService.identify(payload);
        res.status(200).json(result);
    } catch (error) {
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
