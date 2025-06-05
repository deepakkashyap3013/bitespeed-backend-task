"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.identifyContact = void 0;
const identity_service_1 = require("../services/identity.service");
const identityService = new identity_service_1.IdentityService();
const identifyContact = async (req, res) => {
    const payload = req.body;
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
    }
    catch (error) {
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.identifyContact = identifyContact;
