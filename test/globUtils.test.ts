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
});
