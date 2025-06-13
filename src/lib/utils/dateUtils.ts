/**
 * Utility functions for handling dates and Firestore Timestamps.
 */

/**
 * Safely converts a value to a Date object.
 * This function can handle Firestore Timestamps, date strings, or numbers,
 * and will return undefined without crashing if the input is invalid.
 * 
 * @param field The value to convert (e.g., from a Firestore document).
 * @returns A Date object, or undefined if the conversion fails.
 */
export const safeToDate = (field: any): Date | undefined => {
    if (!field) {
        return undefined;
    }
    // If it has a toDate method, it's likely a Firestore Timestamp
    if (typeof field.toDate === 'function') {
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