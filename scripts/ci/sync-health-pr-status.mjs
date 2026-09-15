import fs from 'node:fs/promises';

const reportPath = 'artifacts/health-convergence-preflight.json';
const markerStart = '<!-- HEALTH_CONVERGENCE_STATUS_START -->';
const markerEnd = '<!-- HEALTH_CONVERGENCE_STATUS_END -->';

const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
const pr = process.env.PR_NUMBER;
const headSha = process.env.PR_HEAD_SHA || '';

if (!token || !repo || !pr) {
  console.error('HEALTH_PR_STATUS_SYNC_FAIL: missing GITHUB_TOKEN, GITHUB_REPOSITORY or PR_NUMBER');
  process.exit(1);
}

let report;
try {
  report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
} catch (error) {
  console.error(`HEALTH_PR_STATUS_SYNC_FAIL: cannot read ${reportPath}: ${error.message}`);
  process.exit(1);
}

const [owner, name] = repo.split('/');
const api = `https://api.github.com/repos/${owner}/${name}/pulls/${pr}`;
const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
};

const prResponse = await fetch(api, { headers });
if (!prResponse.ok) {
  console.error(`HEALTH_PR_STATUS_SYNC_FAIL: GET PR returned ${prResponse.status}`);
  process.exit(1);
}
const current = await prResponse.json();

const lines = [
  markerStart,
  '### Automated Health convergence status',
  '',
  `- State: **${report.status}**`,
  `- Head SHA: \`${headSha || 'unknown'}\``,
  `- Root-cause blockers: **${report.root_cause_count ?? report.blockers?.length ?? 0}**`,
  `- Findings: **${report.finding_count ?? report.findings?.length ?? 0}**`,
  `- Downstream policy: **${report.downstream_policy || (report.can_run_build_browser_visual ? 'ALLOW_INTERNAL_GATES' : 'SKIP_BUILD_BROWSER_VISUAL_DEPLOYMENT')}**`,
  `- Build / browser / visual eligible: **${report.can_run_build_browser_visual ? 'YES' : 'NO'}**`,
  `- External deployment: **${report.external_deployment?.status || 'NOT_EVALUATED'}** (${report.external_deployment?.classification || 'EXTERNAL_DEPENDENCY'})`,
];

if (Array.isArray(report.blockers) && report.blockers.length) {
  lines.push('', 'Root causes and deterministic next actions:');
  for (const blocker of report.blockers) {
    const issueCodes = Array.isArray(blocker.issues) ? blocker.issues.map((i) => i.code).join(', ') : blocker.code;
    lines.push(`- \`${blocker.asset || blocker.code}\`: ${issueCodes}`);
    if (blocker.remediation?.action) lines.push(`  - Action: \`${blocker.remediation.action}\``);
    if (blocker.remediation?.expected_sha256) lines.push(`  - Expected SHA-256: \`${blocker.remediation.expected_sha256}\``);
    if (blocker.remediation?.auto_retry === false) lines.push('  - Auto-retry: **NO**');
  }
}
lines.push('', '_Generated from `artifacts/health-convergence-preflight.json`; do not hand-edit this block._', markerEnd);
const block = lines.join('\n');

const body = current.body || '';
const escapedStart = markerStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const escapedEnd = markerEnd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const re = new RegExp(`${escapedStart}[\\s\\S]*?${escapedEnd}`, 'm');
const nextBody = re.test(body) ? body.replace(re, block) : `${body.trim()}\n\n${block}\n`;

const update = await fetch(api, { method: 'PATCH', headers, body: JSON.stringify({ body: nextBody }) });
if (!update.ok) {
  const text = await update.text();
  console.error(`HEALTH_PR_STATUS_SYNC_FAIL: PATCH PR returned ${update.status}: ${text}`);
  process.exit(1);
}
console.log(`HEALTH_PR_STATUS_SYNC_PASS: PR #${pr} status block updated from machine-readable preflight.`);
