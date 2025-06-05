export interface Contact {
    id: number;
    phone_number: string | null;
    email: string | null;
    linked_id: number | null;
    link_precedence: "primary" | "secondary";
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface IdentifyRequest {
    email?: string;
    phoneNumber?: string;
}

export interface IdentifyResponse {
    contact: {
        primaryContactId: number;
        emails: string[];
        phoneNumbers: string[];
        secondaryContactIds: number[];
    };
}
