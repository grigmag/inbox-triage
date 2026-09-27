export type BriefReplyCheckResult = {
  check: string;
  passed: boolean;
  /** The first offending text, or null when the check passed. */
  match: string | null;
};

// Each pattern finds text a plain-text email body must not contain. Plain
// dash lists are allowed because people write them in plain text too.
const STRUCTURE_CHECKS: readonly { check: string; pattern: RegExp }[] = [
  { check: 'noSubjectLine', pattern: /^\s*(subject|θέμα)\s*:.*$/imu },
  {
    check: 'noMarkdown',
    pattern:
      /^\s*#{1,6}\s.*$|\*\*[^*\n]+\*\*|__[^_\n]+__|\[[^\]\n]+\]\([^)\n]+\)|`[^`\n]+`/mu,
  },
  { check: 'noHtml', pattern: /<\/?[a-z][a-z0-9]*(\s[^<>]*)?\/?>/iu },
  // Placeholders such as "[Your Name]" or "{{name}}" left for the user.
  { check: 'noPlaceholder', pattern: /\[[^\]\n]*\]|\{\{[^}\n]*\}\}/u },
];

/**
 * Checks only the structure of a generated reply. A person reads the
 * language, greeting, question coverage, and tone in the report.
 */
export function checkBriefReplyStructure(
  body: string,
): BriefReplyCheckResult[] {
  const checks = STRUCTURE_CHECKS.map(({ check, pattern }) => {
    const match = pattern.exec(body)?.[0] ?? null;
    return { check, passed: match === null, match };
  });

  return [
    {
      check: 'nonEmpty',
      passed: body.trim().length > 0,
      match: null,
    },
    ...checks,
  ];
}
