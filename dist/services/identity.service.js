"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentityService = void 0;
const db_1 = __importDefault(require("../db"));
class IdentityService {
    async identify(payload) {
        const { email, phoneNumber } = payload;
        // Ensure phoneNumber is treated as string if present
        const phoneStr = phoneNumber ? String(phoneNumber) : undefined;
        const client = await db_1.default.getClient();
        try {
            await client.query('BEGIN');
            // Find contacts matching either email or phone number
            let queryText = `
            SELECT * FROM "contacts"
            WHERE "deleted_at" IS NULL AND (`;
            const queryParams = [];
            let conditions = [];
            if (email) {
                queryParams.push(email);
                conditions.push(`email = $${queryParams.length}`);
            }
            if (phoneStr) {
                queryParams.push(phoneStr);
                conditions.push(`"phone_number" = $${queryParams.length}`);
            }
            queryText += conditions.join(' OR ') + `) ORDER BY "created_at" ASC;`;
            const { rows: matchingContacts } = await client.query(queryText, queryParams);
            if (matchingContacts.length === 0) {
                // Case 1: No existing contacts match. Create a new primary contact.
                const insertQuery = `
                INSERT INTO "contacts" (email, "phone_number", "link_precedence", "created_at", "updated_at")
                VALUES ($1, $2, 'primary', NOW(), NOW())
                RETURNING *;
                `;
                const { rows: [newContact] } = await client.query(insertQuery, [email, phoneStr]);
                await client.query('COMMIT');
                return {
                    contact: {
                        primaryContactId: newContact.id,
                        emails: newContact.email ? [newContact.email] : [],
                        phoneNumbers: newContact.phone_number ? [newContact.phone_number] : [],
                        secondaryContactIds: [],
                    },
                };
            }
            // Case 2: Existing contacts match.
            // Determine the true primary contact(s) from the matches
            let primaryContacts = [];
            const linkedIdsToFetch = new Set();
            for (const contact of matchingContacts) {
                if (contact.link_precedence === 'primary') {
                    primaryContacts.push(contact);
                }
                else if (contact.linked_id) {
                    linkedIdsToFetch.add(contact.linked_id);
                }
            }
            if (linkedIdsToFetch.size > 0) {
                const { rows: linkedPrimaryContacts } = await client.query(`SELECT * FROM "contacts" WHERE id = ANY($1::int[]) AND "link_precedence" = 'primary' AND "deleted_at" IS NULL`, [Array.from(linkedIdsToFetch)]);
                primaryContacts.push(...linkedPrimaryContacts);
            }
            // Deduplicate and sort primary contacts by creation date
            const uniquePrimaryContactsMap = new Map();
            primaryContacts.forEach(pc => {
                if (!uniquePrimaryContactsMap.has(pc.id)) {
                    uniquePrimaryContactsMap.set(pc.id, pc);
                }
            });
            // Sort primary contacts by creation date
            let sortedPrimaryContacts = Array.from(uniquePrimaryContactsMap.values()).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            // If no primary contacts were found, create a new primary contact
            if (sortedPrimaryContacts.length === 0 && matchingContacts.length > 0) {
                // This is a fallback for potentially orphaned secondaries.
                console.warn("Warning: No primary contacts found for existing matches. Data may be inconsistent.");
                // Fallback: create a new primary contact.
                const insertQuery = `
                    INSERT INTO "contacts" (email, "phone_number", "link_precedence", "created_at", "updated_at")
                    VALUES ($1, $2, 'primary', NOW(), NOW())
                    RETURNING *;
                    `;
                const { rows: [newContact] } = await client.query(insertQuery, [email, phoneStr]);
                await client.query('COMMIT');
                return {
                    contact: {
                        primaryContactId: newContact.id,
                        emails: newContact.email ? [newContact.email] : [],
                        phoneNumbers: newContact.phone_number ? [newContact.phone_number] : [],
                        secondaryContactIds: [],
                    },
                };
            }
            let ultimatePrimaryContact = sortedPrimaryContacts[0];
            // Link other primary contacts to the ultimatePrimaryContact
            for (let i = 1; i < sortedPrimaryContacts.length; i++) {
                const secondaryPrimary = sortedPrimaryContacts[i];
                if (secondaryPrimary.id !== ultimatePrimaryContact.id) {
                    // Update this primary to become secondary
                    await client.query(`UPDATE "contacts" SET "linked_id" = $1, "link_precedence" = 'secondary' WHERE id = $2`, [ultimatePrimaryContact.id, secondaryPrimary.id]);
                    // Update any contacts that were secondary to this now-demoted primary
                    await client.query(`UPDATE "contacts" SET "linked_id" = $1 WHERE "linked_id" = $2`, [ultimatePrimaryContact.id, secondaryPrimary.id]);
                }
            }
            // Ensuring all originally matched contacts that were secondary now point to the ultimatePrimaryContact
            for (const contact of matchingContacts) {
                if (contact.link_precedence === 'secondary' && contact.linked_id !== ultimatePrimaryContact.id) {
                    // Check if its current primary is one of the demoted ones or if it should be relinked
                    const currentPrimaryIsDemoted = sortedPrimaryContacts.slice(1).some(sp => sp.id === contact.linked_id);
                    if (currentPrimaryIsDemoted || !uniquePrimaryContactsMap.has(contact.linked_id)) {
                        await client.query(`UPDATE "contacts" SET "linked_id" = $1 WHERE id = $2`, [ultimatePrimaryContact.id, contact.id]);
                    }
                }
            }
            // Check if a new secondary contact needs to be created
            const { rows: allConsolidatedContacts } = await client.query(`SELECT * FROM "contacts" WHERE (id = $1 OR "linked_id" = $1) AND "deleted_at" IS NULL`, [ultimatePrimaryContact.id]);
            const groupEmails = new Set(allConsolidatedContacts.map(c => c.email).filter(Boolean));
            const groupPhoneNumbers = new Set(allConsolidatedContacts.map(c => c.phone_number).filter(Boolean));
            const isNewEmail = email && !groupEmails.has(email);
            const isNewPhoneNumber = phoneStr && !groupPhoneNumbers.has(phoneStr);
            if ((email || phoneStr) && (isNewEmail || isNewPhoneNumber)) {
                // Create new secondary contact only if the exact pair (email, phoneStr) doesn't already exist
                const exactPairExists = allConsolidatedContacts.some(c => c.email === email && c.phone_number === phoneStr);
                if (!exactPairExists) {
                    await client.query(`INSERT INTO "contacts" (email, "phone_number", "linked_id", "link_precedence", "created_at", "updated_at")
               VALUES ($1, $2, $3, 'secondary', NOW(), NOW())`, [email, phoneStr, ultimatePrimaryContact.id]);
                }
            }
            await client.query('COMMIT');
            // Prepare response: Fetch all contacts linked to the ultimate primary
            const { rows: finalPrimaryContactRow } = await client.query(`SELECT * FROM "contacts" WHERE id = $1 AND "deleted_at" IS NULL`, [ultimatePrimaryContact.id]);
            const finalPrimaryContact = finalPrimaryContactRow[0] || ultimatePrimaryContact;
            const { rows: secondaryContacts } = await client.query(`SELECT * FROM "contacts" WHERE "linked_id" = $1 AND "link_precedence" = 'secondary' AND "deleted_at" IS NULL ORDER BY "created_at" ASC`, [finalPrimaryContact.id]);
            const emailsSet = new Set();
            if (finalPrimaryContact.email)
                emailsSet.add(finalPrimaryContact.email);
            secondaryContacts.forEach(c => c.email && emailsSet.add(c.email));
            const phoneNumbersSet = new Set();
            if (finalPrimaryContact.phone_number)
                phoneNumbersSet.add(finalPrimaryContact.phone_number);
            secondaryContacts.forEach(c => c.phone_number && phoneNumbersSet.add(c.phone_number));
            const responseEmails = [];
            if (finalPrimaryContact.email)
                responseEmails.push(finalPrimaryContact.email);
            emailsSet.forEach(e => {
                if (e !== finalPrimaryContact.email)
                    responseEmails.push(e);
            });
            const responsePhoneNumbers = [];
            if (finalPrimaryContact.phone_number)
                responsePhoneNumbers.push(finalPrimaryContact.phone_number);
            phoneNumbersSet.forEach(p => {
                if (p !== finalPrimaryContact.phone_number)
                    responsePhoneNumbers.push(p);
            });
            return {
                contact: {
                    primaryContactId: finalPrimaryContact.id,
                    emails: responseEmails,
                    phoneNumbers: responsePhoneNumbers,
                    secondaryContactIds: secondaryContacts.map(c => c.id),
                },
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Error in identity service:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
}
exports.IdentityService = IdentityService;
