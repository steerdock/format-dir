import * as assert from 'assert';
import { globToRegExp, parseGitignoreContent } from '../src/globUtils';

describe('globToRegExp', () => {
    it('converts star wildcard to .*', () => {
        const re = globToRegExp('foo*.bar');
        assert.ok(re.test('foo1.bar'));
        assert.ok(re.test('foobar.bar'));
        assert.ok(re.test('foo.bar'));  // * matches empty sequence
        assert.ok(!re.test('fooXbazr'));
    });

    it('converts question mark to single char', () => {
        const re = globToRegExp('foo?.bar');
        assert.ok(re.test('foo1.bar'));
        assert.ok(!re.test('foo12.bar'));
    });

    it('escapes regex metacharacters', () => {
        const re = globToRegExp('dir.name');
        assert.ok(re.test('dir.name'));
        assert.ok(!re.test('dirXname'));
    });

    it('anchors matches and keeps a single star within one path segment', () => {
        const re = globToRegExp('**/keep.log');
        assert.ok(re.test('keep.log'));
        assert.ok(re.test('logs/keep.log'));
        assert.ok(!re.test('logs/notkeep.log'));
        assert.ok(!re.test('logs/keep.log.bak'));
    });
});

describe('parseGitignoreContent', () => {
    it('skips blank lines and comments', () => {
        const result = parseGitignoreContent('# comment\n\n   \n# another');
        assert.deepStrictEqual(result.patterns, []);
        assert.deepStrictEqual(result.negationPatterns, []);
    });

    it('converts a bare directory pattern with both the dir and its contents (root)', () => {
        const result = parseGitignoreContent('node_modules');
        assert.ok(result.patterns.includes('**/node_modules'));
        assert.ok(result.patterns.includes('**/node_modules/**'));
    });

    it('anchors leading-slash patterns to the prefix at root', () => {
        const result = parseGitignoreContent('/dist');
        assert.ok(result.patterns.includes('dist'));
        assert.ok(result.patterns.includes('dist/**'));
    });

    it('keeps wildcard patterns as a single entry', () => {
        const result = parseGitignoreContent('*.log');
        assert.ok(result.patterns.includes('**/*.log'));
        assert.strictEqual(result.patterns.length, 1);
    });

    it('collects negation patterns separately', () => {
        const result = parseGitignoreContent('*.log\n!keep.log');
        assert.ok(result.patterns.includes('**/*.log'));
        assert.deepStrictEqual(result.negationPatterns, ['**/keep.log']);
    });

    it('applies a dirPrefix for nested .gitignore', () => {
        const result = parseGitignoreContent('/foo\nbar\n!baz', 'sub/');
        assert.ok(result.patterns.includes('sub/foo'));
        assert.ok(result.patterns.includes('sub/foo/**'));
        assert.ok(result.patterns.includes('sub/**/bar'));
        assert.ok(result.patterns.includes('sub/**/bar/**'));
        assert.deepStrictEqual(result.negationPatterns, ['sub/**/baz']);
    });

    it('strips trailing slashes from patterns', () => {
        const result = parseGitignoreContent('build/');
        assert.ok(result.patterns.includes('**/build'));
        assert.ok(result.patterns.includes('**/build/**'));
    });

    it('keeps anchored nested patterns relative to the nested ignore file', () => {
        const result = parseGitignoreContent('/cache/*.json', 'packages/app/');
        assert.ok(result.patterns.includes('packages/app/cache/*.json'));
    });

    it('supports negating a nested file pattern', () => {
        const result = parseGitignoreContent('*.log\n!important.log', 'logs/');
        assert.ok(result.patterns.includes('logs/**/*.log'));
        assert.deepStrictEqual(result.negationPatterns, ['logs/**/important.log']);
    });

    it('preserves rule order for repeated exclusion and negation', () => {
        const result = parseGitignoreContent('*.log\n!keep.log\nkeep.log');
        assert.deepStrictEqual(result.rules, [
            { pattern: '**/*.log', negated: false },
            { pattern: '**/keep.log', negated: true },
            { pattern: '**/keep.log', negated: false },
            { pattern: '**/keep.log/**', negated: false },
        ]);
    });
});
