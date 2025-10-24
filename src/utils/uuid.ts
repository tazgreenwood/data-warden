/**
 * Utility functions for handling UUIDs in binary format
 */

/**
 * Converts a binary16 UUID (16 bytes) to standard UUID string format
 * Example: Buffer<16 bytes> -> "550e8400-e29b-41d4-a716-446655440000"
 */
export function binary16ToUuid(buffer: Buffer | Uint8Array): string {
    if (!buffer || buffer.length !== 16) {
        return '';
    }

    const hex = Array.from(buffer)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    // Format as UUID: 8-4-4-4-12
    return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20, 32)
    ].join('-');
}

/**
 * Detects if a value looks like a binary UUID (16 bytes)
 */
export function isBinaryUuid(value: any): boolean {
    if (!value) return false;

    // Check if it's a Buffer or Uint8Array with exactly 16 bytes
    if (value instanceof Buffer || value instanceof Uint8Array) {
        return value.length === 16;
    }

    // Check if it's a base64 encoded 16-byte buffer (22-24 chars)
    if (typeof value === 'string' && value.length >= 22 && value.length <= 24) {
        try {
            const decoded = Buffer.from(value, 'base64');
            return decoded.length === 16;
        } catch {
            return false;
        }
    }

    return false;
}

/**
 * Detects if a value looks like a UUID string
 */
export function isUuidString(value: any): boolean {
    if (typeof value !== 'string') return false;

    // UUID regex: 8-4-4-4-12 format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
}

/**
 * Formats any UUID-like value to standard UUID string format
 */
export function formatUuid(value: any): string {
    if (!value) return '';

    // Already a UUID string
    if (isUuidString(value)) {
        return value;
    }

    // Binary UUID
    if (isBinaryUuid(value)) {
        if (typeof value === 'string') {
            // Base64 encoded
            const buffer = Buffer.from(value, 'base64');
            return binary16ToUuid(buffer);
        } else {
            // Direct buffer
            return binary16ToUuid(value);
        }
    }

    return '';
}
