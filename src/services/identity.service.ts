import { IdentifyRequest, IdentifyResponse } from '../types/identity.types';

export class IdentityService {
    async identify(payload: IdentifyRequest): Promise<IdentifyResponse> {
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
