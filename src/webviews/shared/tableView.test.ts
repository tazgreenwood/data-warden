import { describe, it, expect } from 'vitest';
import { getTableViewHtml } from './tableView';

describe('getTableViewHtml', () => {
    it('should generate HTML with title', () => {
        const html = getTableViewHtml({
            title: 'Test Viewer',
            showPagination: false,
            showSqlDisplay: false
        });

        expect(html).toContain('<title>Test Viewer</title>');
    });

    it('should show pagination when enabled', () => {
        const html = getTableViewHtml({
            title: 'Test Viewer',
            showPagination: true,
            showSqlDisplay: false
        });

        expect(html).toContain('prevPage');
        expect(html).toContain('nextPage');
        expect(html).toContain('pageInfo');
        expect(html).toContain('display: flex');
    });

    it('should hide pagination when disabled', () => {
        const html = getTableViewHtml({
            title: 'Test Viewer',
            showPagination: false,
            showSqlDisplay: false
        });

        expect(html).toContain('display: none');
    });

    it('should show SQL display when enabled', () => {
        const html = getTableViewHtml({
            title: 'Test Viewer',
            showPagination: false,
            showSqlDisplay: true
        });

        expect(html).toContain('sql-display');
        expect(html).toContain('display: block');
    });

    it('should hide SQL display when disabled', () => {
        const html = getTableViewHtml({
            title: 'Test Viewer',
            showPagination: false,
            showSqlDisplay: false
        });

        expect(html).toContain('sql-display');
        expect(html).toContain('display: none');
    });

    it('should include export buttons', () => {
        const html = getTableViewHtml({
            title: 'Test Viewer',
            showPagination: false,
            showSqlDisplay: false
        });

        expect(html).toContain('exportJson');
        expect(html).toContain('exportCsv');
        expect(html).toContain('Export JSON');
        expect(html).toContain('Export CSV');
    });

    it('should include refresh button', () => {
        const html = getTableViewHtml({
            title: 'Test Viewer',
            showPagination: false,
            showSqlDisplay: false
        });

        expect(html).toContain('id="refresh"');
        expect(html).toContain('Refresh');
    });

    it('should include sorting functionality', () => {
        const html = getTableViewHtml({
            title: 'Test Viewer',
            showPagination: false,
            showSqlDisplay: false
        });

        expect(html).toContain('sort-indicator');
        expect(html).toContain('sortTable');
    });

    it('should include additional buttons when provided', () => {
        const html = getTableViewHtml({
            title: 'Test Viewer',
            showPagination: false,
            showSqlDisplay: false,
            additionalButtons: '<button id="custom">Custom Action</button>'
        });

        expect(html).toContain('id="custom"');
        expect(html).toContain('Custom Action');
    });

    it('should have proper CSP meta tag', () => {
        const html = getTableViewHtml({
            title: 'Test Viewer',
            showPagination: false,
            showSqlDisplay: false
        });

        expect(html).toContain('Content-Security-Policy');
        expect(html).toContain("default-src 'none'");
        expect(html).toContain("style-src 'unsafe-inline'");
    });

    it('should include nonce in script tag', () => {
        const html = getTableViewHtml({
            title: 'Test Viewer',
            showPagination: false,
            showSqlDisplay: false
        });

        expect(html).toMatch(/<script nonce="[a-zA-Z0-9]{32}">/);
    });
});
