"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentityService = void 0;
class IdentityService {
    async identify(payload) {
        const { email, phoneNumber } = payload;
        // Ensure phoneNumber is treated as string if present
        const phoneStr = phoneNumber ? String(phoneNumber) : undefined;
        console.log(email, phoneStr);
        // TODO: Implement the logic to identify the contact
        return {
            contact: {
                primaryContactId: 0,
                emails: [],
                phoneNumbers: [],
                secondaryContactIds: [],
            },
        };
    }
}
exports.IdentityService = IdentityService;
