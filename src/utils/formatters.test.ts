import { describe, it, expect } from 'vitest';
import { formatBytes, formatNumber } from './formatters';

describe('formatBytes', () => {
    it('should format 0 bytes', () => {
        expect(formatBytes(0)).toBe('0 Bytes');
    });

    it('should format bytes', () => {
        expect(formatBytes(500)).toBe('500 Bytes');
        expect(formatBytes(1023)).toBe('1023 Bytes');
    });

    it('should format kilobytes', () => {
        expect(formatBytes(1024)).toBe('1 KB');
        expect(formatBytes(1536)).toBe('1.5 KB');
        expect(formatBytes(10240)).toBe('10 KB');
    });

    it('should format megabytes', () => {
        expect(formatBytes(1048576)).toBe('1 MB');
        expect(formatBytes(1572864)).toBe('1.5 MB');
        expect(formatBytes(10485760)).toBe('10 MB');
    });

    it('should format gigabytes', () => {
        expect(formatBytes(1073741824)).toBe('1 GB');
        expect(formatBytes(1610612736)).toBe('1.5 GB');
        expect(formatBytes(10737418240)).toBe('10 GB');
    });

    it('should handle custom decimal places', () => {
        expect(formatBytes(1536, 0)).toBe('2 KB');
        expect(formatBytes(1536, 1)).toBe('1.5 KB');
        expect(formatBytes(1536, 3)).toBe('1.5 KB');
    });

    it('should handle very large numbers', () => {
        expect(formatBytes(1099511627776)).toBe('1 TB');
        expect(formatBytes(1125899906842624)).toBe('1 PB');
    });
});

describe('formatNumber', () => {
    it('should format small numbers', () => {
        expect(formatNumber(0)).toBe('0');
        expect(formatNumber(1)).toBe('1');
        expect(formatNumber(999)).toBe('999');
    });

    it('should format thousands', () => {
        expect(formatNumber(1000)).toBe('1,000');
        expect(formatNumber(1234)).toBe('1,234');
        expect(formatNumber(9999)).toBe('9,999');
    });

    it('should format millions', () => {
        expect(formatNumber(1000000)).toBe('1,000,000');
        expect(formatNumber(1234567)).toBe('1,234,567');
    });

    it('should format billions', () => {
        expect(formatNumber(1000000000)).toBe('1,000,000,000');
        expect(formatNumber(1234567890)).toBe('1,234,567,890');
    });

    it('should handle negative numbers', () => {
        expect(formatNumber(-1234)).toBe('-1,234');
        expect(formatNumber(-1000000)).toBe('-1,000,000');
    });
});
