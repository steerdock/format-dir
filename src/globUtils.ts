/**
 * Escape a glob-like pattern for use in RegExp.
 * Handles dot, question, star, and other regex metacharacters.
 */
export function globToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&") // Escape regex metacharacters (except * and ?)
    .replace(/\*/g, ".*") // * -> .*
    .replace(/\?/g, "."); // ? -> .
  return new RegExp(escaped);
}

// Parse .gitignore text content into glob exclude patterns and negation patterns.
//
// The dirPrefix is the directory prefix to apply to each pattern (empty string for
// the workspace root, or "subdir/" for a nested .gitignore). An empty dirPrefix
// preserves the original root-level behavior where non-anchored patterns match
// anywhere via a leading "**/" prefix.
//
// Returns separate patterns (to exclude) and negationPatterns (to re-include).
export function parseGitignoreContent(
  text: string,
  dirPrefix: string = "",
): { patterns: string[]; negationPatterns: string[] } {
  const patterns: string[] = [];
  const negationPatterns: string[] = [];
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    // Handle negation patterns separately - add them at the end
    // so they can re-include files previously excluded
    if (trimmed.startsWith("!")) {
      const negated = trimmed.slice(1).trim();
      if (negated) {
        let negGlob = negated;
        if (negGlob.endsWith("/")) {
          negGlob = negGlob.slice(0, -1);
        }
        if (negGlob.startsWith("/")) {
          negGlob = dirPrefix + negGlob.slice(1);
        } else {
          negGlob = dirPrefix + "**/" + negGlob;
        }
        negationPatterns.push(negGlob);
      }
      continue;
    }

    // Convert .gitignore pattern to glob pattern
    let globPattern = trimmed;

    // Remove trailing slashes
    if (globPattern.endsWith("/")) {
      globPattern = globPattern.slice(0, -1);
    }

    // Detect wildcard on the original pattern (before the '**/' prefix is
    // added), otherwise a bare directory name would be misclassified as a
    // wildcard and miss its '/**' contents entry.
    const hasWildcard = globPattern.includes("*");

    // Handle patterns starting with /
    if (globPattern.startsWith("/")) {
      globPattern = dirPrefix + globPattern.slice(1);
    } else {
      // If pattern doesn't start with /, it can match anywhere
      globPattern = dirPrefix + "**/" + globPattern;
    }

    // Handle directory patterns (without wildcard)
    if (!hasWildcard) {
      // Add both the path itself and everything inside
      patterns.push(globPattern);
      patterns.push(globPattern + "/**");
    } else {
      patterns.push(globPattern);
    }
  }

  return { patterns, negationPatterns };
}
