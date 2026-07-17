/**
 * Utility functions for handling dates and Firestore Timestamps.
 */

type TimestampLike = {
    toDate: () => Date;
    toMillis?: () => number;
    _seconds?: number;
    _nanoseconds?: number;
};

type SerializableCard = Record<string, unknown> & {
    createdAt?: unknown;
    updatedAt?: unknown;
    coverImage?: unknown;
    galleryMedia?: unknown;
};

function isTimestampLike(value: unknown): value is TimestampLike {
    return typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function';
}

/**
 * Safely converts a value to a Date object.
 * This function can handle Firestore Timestamps, date strings, or numbers,
 * and will return undefined without crashing if the input is invalid.
 * 
 * @param field The value to convert (e.g., from a Firestore document).
 * @returns A Date object, or undefined if the conversion fails.
 */
export const safeToDate = (field: unknown): Date | undefined => {
    if (!field) {
        return undefined;
    }
    // If it has a toDate method, it's likely a Firestore Timestamp
    if (isTimestampLike(field)) {
        return field.toDate();
    }
    // If it's a string or number, try to parse it
    if (typeof field === 'string' || typeof field === 'number') {
        const date = new Date(field);
        // Check if the parsed date is valid
        if (!isNaN(date.getTime())) {
            return date;
        }
    }
    return undefined;
};

/**
 * Serializes a card object for client components by converting Firestore values to plain data.
 * This prevents the "Only plain objects can be passed to Client Components" error.
 * 
 * @param card The card object from Firestore that may contain Timestamps
 * @returns A serialized card object safe for client components
 */
export const serializeCardForClient = <T extends SerializableCard>(card: T | null | undefined): T | null | undefined => {
    if (!card) return card;

    const serializeValue = (value: unknown): unknown => {
        if (value === null || value === undefined) return value;
        if (typeof value !== 'object') return value;
        if (value instanceof Date) return value.getTime();
        if (isTimestampLike(value)) {
            return typeof value.toMillis === 'function' ? value.toMillis() : value.toDate().getTime();
        }
        if (Array.isArray(value)) return value.map(serializeValue);

        return Object.fromEntries(
            Object.entries(value).map(([key, nestedValue]) => [key, serializeValue(nestedValue)])
        );
    };

    return serializeValue(card) as T;
}; 
