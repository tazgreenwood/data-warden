import { describe, it, expect } from 'vitest';
import { binary16ToUuid, isBinaryUuid, isUuidString, formatUuid } from './uuid';

describe('binary16ToUuid', () => {
    it('should convert 16-byte buffer to UUID string', () => {
        const buffer = Buffer.from([
            0x55, 0x0e, 0x84, 0x00,
            0xe2, 0x9b,
            0x41, 0xd4,
            0xa7, 0x16,
            0x44, 0x66, 0x55, 0x44, 0x00, 0x00
        ]);

        expect(binary16ToUuid(buffer)).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should handle Uint8Array', () => {
        const buffer = new Uint8Array([
            0x12, 0x34, 0x56, 0x78,
            0x90, 0xab,
            0xcd, 0xef,
            0x12, 0x34,
            0x56, 0x78, 0x90, 0xab, 0xcd, 0xef
        ]);

        expect(binary16ToUuid(buffer)).toBe('12345678-90ab-cdef-1234-567890abcdef');
    });

    it('should return empty string for invalid input', () => {
        expect(binary16ToUuid(Buffer.from([1, 2, 3]))).toBe('');
        expect(binary16ToUuid(null as any)).toBe('');
        expect(binary16ToUuid(undefined as any)).toBe('');
    });
});

describe('isBinaryUuid', () => {
    it('should detect 16-byte Buffer', () => {
        const buffer = Buffer.alloc(16);
        expect(isBinaryUuid(buffer)).toBe(true);
    });

    it('should detect 16-byte Uint8Array', () => {
        const buffer = new Uint8Array(16);
        expect(isBinaryUuid(buffer)).toBe(true);
    });

    it('should detect base64 encoded 16-byte buffer', () => {
        const buffer = Buffer.alloc(16);
        const base64 = buffer.toString('base64');
        expect(isBinaryUuid(base64)).toBe(true);
    });

    it('should reject non-16-byte buffers', () => {
        expect(isBinaryUuid(Buffer.alloc(15))).toBe(false);
        expect(isBinaryUuid(Buffer.alloc(17))).toBe(false);
    });

    it('should reject non-buffer values', () => {
        expect(isBinaryUuid('not-a-uuid')).toBe(false);
        expect(isBinaryUuid(123)).toBe(false);
        expect(isBinaryUuid(null)).toBe(false);
        expect(isBinaryUuid(undefined)).toBe(false);
    });
});

describe('isUuidString', () => {
    it('should detect valid UUID strings', () => {
        expect(isUuidString('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
        expect(isUuidString('12345678-90ab-cdef-1234-567890abcdef')).toBe(true);
        expect(isUuidString('ABCDEF12-3456-7890-ABCD-EF1234567890')).toBe(true);
    });

    it('should reject invalid UUID strings', () => {
        expect(isUuidString('not-a-uuid')).toBe(false);
        expect(isUuidString('550e8400-e29b-41d4-a716')).toBe(false); // Too short
        expect(isUuidString('550e8400-e29b-41d4-a716-446655440000-extra')).toBe(false); // Too long
        expect(isUuidString('550e8400_e29b_41d4_a716_446655440000')).toBe(false); // Wrong separator
    });

    it('should reject non-string values', () => {
        expect(isUuidString(123)).toBe(false);
        expect(isUuidString(null)).toBe(false);
        expect(isUuidString(undefined)).toBe(false);
        expect(isUuidString(Buffer.alloc(16))).toBe(false);
    });
});

describe('formatUuid', () => {
    it('should pass through valid UUID strings', () => {
        const uuid = '550e8400-e29b-41d4-a716-446655440000';
        expect(formatUuid(uuid)).toBe(uuid);
    });

    it('should convert binary UUID to string', () => {
        const buffer = Buffer.from([
            0x55, 0x0e, 0x84, 0x00,
            0xe2, 0x9b,
            0x41, 0xd4,
            0xa7, 0x16,
            0x44, 0x66, 0x55, 0x44, 0x00, 0x00
        ]);

        expect(formatUuid(buffer)).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should convert base64 encoded binary UUID', () => {
        const buffer = Buffer.from([
            0x55, 0x0e, 0x84, 0x00,
            0xe2, 0x9b,
            0x41, 0xd4,
            0xa7, 0x16,
            0x44, 0x66, 0x55, 0x44, 0x00, 0x00
        ]);
        const base64 = buffer.toString('base64');

        expect(formatUuid(base64)).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should return empty string for invalid values', () => {
        expect(formatUuid('not-a-uuid')).toBe('');
        expect(formatUuid(123)).toBe('');
        expect(formatUuid(null)).toBe('');
        expect(formatUuid(undefined)).toBe('');
    });
});
