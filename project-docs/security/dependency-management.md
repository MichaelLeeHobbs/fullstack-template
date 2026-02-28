# Dependency Management

> **[Template]** This covers the base template feature. Extend or modify for your project.

> Dependency auditing, automated scanning, update policies, and license compliance.

---

## Overview

Dependency management is a critical aspect of the application's security posture. Third-party packages introduce potential vulnerabilities, license issues, and supply chain risks. This document defines the processes and policies for managing dependencies across the pnpm monorepo.

---

## Dependency Audit

### Manual Audit

Run the dependency audit to check for known vulnerabilities:

```bash
# Audit all packages in the monorepo
pnpm audit

# Audit with JSON output for tooling
pnpm audit --json

# Audit production dependencies only
pnpm audit --prod

# Audit a specific workspace
pnpm --filter api audit
pnpm --filter web audit
```

### Interpreting Results

| Severity | Action Required | Timeline |
|----------|----------------|----------|
| **Critical** | Immediate patch or mitigation | Same day |
| **High** | Update within SLA | Within 1 week |
| **Moderate** | Schedule update | Within 2 weeks |
| **Low** | Include in next update cycle | Within 1 month |

### Resolving Vulnerabilities

```bash
# Update a specific package to its latest patch version
pnpm update <package-name> --filter api

# Update all packages to their latest compatible versions
pnpm update

# Force resolution of a transitive dependency (pnpm overrides)
# In package.json:
{
  "pnpm": {
    "overrides": {
      "vulnerable-package": ">=2.0.1"
    }
  }
}
```

---

## Automated Scanning

### GitHub Dependabot

Configure Dependabot for automated vulnerability alerts and pull requests.

**`.github/dependabot.yml`:**

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "security"
    groups:
      minor-and-patch:
        update-types:
          - "minor"
          - "patch"
    ignore:
      # Ignore major version updates (evaluated manually)
      - dependency-name: "*"
        update-types: ["version-update:semver-major"]
```

### Snyk (Optional)

For enhanced scanning including container images and IaC:

```bash
# Install Snyk CLI
npm install -g snyk

# Authenticate
snyk auth

# Test for vulnerabilities
snyk test --all-projects

# Monitor continuously
snyk monitor --all-projects
```

### CI Pipeline Integration

Add dependency auditing to the CI pipeline:

```yaml
# Example GitHub Actions step
- name: Audit dependencies
  run: pnpm audit --audit-level=high
  # Fail the build if high or critical vulnerabilities are found
```

---

## Update Policy

### Version Update Strategy

| Update Type | Policy | Process | Automation |
|-------------|--------|---------|------------|
| **Patch** (x.x.PATCH) | Auto-merge after CI passes | Dependabot PR with auto-merge | Fully automated |
| **Minor** (x.MINOR.x) | Review and merge weekly | Dependabot PR, review changelog | Semi-automated |
| **Major** (MAJOR.x.x) | Manual evaluation | Create branch, test thoroughly, review breaking changes | Manual |

### Evaluation Criteria for Major Updates

Before upgrading a major version, evaluate:

1. **Breaking changes:** Review the changelog and migration guide
2. **API compatibility:** Check for breaking API changes that affect our code
3. **Dependency tree impact:** Will this update cascade to other packages?
4. **Test coverage:** Do our tests adequately cover the affected functionality?
5. **Community feedback:** Check GitHub issues for post-release regressions
6. **Bundle size impact:** (Frontend) Check for significant size changes

### Key Dependencies to Monitor

| Package | Category | Risk Level | Notes |
|---------|----------|-----------|-------|
| `express` | Backend framework | High | Core dependency, major updates rare |
| `drizzle-orm` | Database ORM | High | Schema and query API changes |
| `jsonwebtoken` | Authentication | Critical | Security-sensitive, test thoroughly |
| `bcrypt` | Cryptography | Critical | Algorithm changes affect stored hashes |
| `zod` | Validation | Medium | Schema API changes |
| `react` | Frontend framework | High | Major updates require migration |
| `@mui/material` | UI components | Medium | API changes in major versions |
| `pino` | Logging | Low | Stable API |
| `otpauth` | MFA/TOTP | Critical | Algorithm changes affect MFA |

---

## Lock File Management

### pnpm-lock.yaml

- **Always commit** `pnpm-lock.yaml` to version control
- Never manually edit the lock file
- Regenerate if corrupted: `rm pnpm-lock.yaml && pnpm install`
- Review lock file changes in PRs (large unexpected changes may indicate supply chain issues)

### Integrity Verification

pnpm verifies package integrity using checksums stored in the lock file. If a checksum mismatch is detected, the install will fail. This protects against:

- Registry compromise (tampered packages)
- MITM attacks during package download
- Accidental corruption

```bash
# Verify lock file integrity
pnpm install --frozen-lockfile

# CI should always use frozen lockfile
pnpm install --frozen-lockfile
```

---

## License Compliance

### Approved Licenses

| License | Status | Notes |
|---------|--------|-------|
| MIT | Approved | Most common, permissive |
| Apache-2.0 | Approved | Permissive, patent grant |
| BSD-2-Clause | Approved | Permissive |
| BSD-3-Clause | Approved | Permissive |
| ISC | Approved | Permissive (MIT equivalent) |
| 0BSD | Approved | Public domain equivalent |

### Licenses Requiring Review

| License | Status | Notes |
|---------|--------|-------|
| LGPL-2.1/3.0 | Review required | Copyleft for modifications to the library |
| MPL-2.0 | Review required | File-level copyleft |
| CC-BY-4.0 | Review required | Usually for documentation/assets |

### Licenses Not Permitted

| License | Status | Notes |
|---------|--------|-------|
| GPL-2.0/3.0 | Not permitted | Strong copyleft, incompatible with proprietary use |
| AGPL-3.0 | Not permitted | Network copyleft |
| SSPL | Not permitted | Server-side copyleft |
| Unlicensed | Not permitted | No license means no usage rights |

### License Checking

```bash
# Install license checker
pnpm add -g license-checker

# Check all licenses in the project
license-checker --start apps/api --summary

# Check for prohibited licenses
license-checker --start apps/api --failOn "GPL-2.0;GPL-3.0;AGPL-3.0;SSPL"

# Export license report
license-checker --start apps/api --csv --out licenses.csv
```

---

## Supply Chain Security

### Best Practices

1. **Use exact versions in lock file:** pnpm does this by default
2. **Review new dependencies:** Before adding a new dependency, check:
   - Maintenance status (last update, open issues)
   - Download count (popularity as a trust signal)
   - Security history (past vulnerabilities)
   - License compatibility
3. **Minimize dependencies:** Prefer standard library when possible
4. **Pin critical dependencies:** For security-critical packages, pin exact versions
5. **Monitor for typosquatting:** Verify package names carefully before installing
6. **Enable npm provenance:** When available, verify package provenance

### Adding New Dependencies

```bash
# Add to a specific workspace
pnpm add <package> --filter api
pnpm add <package> --filter web
pnpm add <package> --filter shared

# Add as dev dependency
pnpm add -D <package> --filter api

# Before adding, check:
# 1. npm page for download stats and maintenance
# 2. GitHub repo for open issues and last commit
# 3. License compatibility
# 4. Bundle size impact (bundlephobia.com for frontend deps)
```

---

## Audit Schedule

| Activity | Frequency | Owner |
|----------|-----------|-------|
| `pnpm audit` review | Every CI build (automated) | CI pipeline |
| Dependabot PR review | Weekly (Monday) | Development team |
| Major dependency evaluation | Per occurrence | Tech lead |
| Full license audit | Quarterly | Engineering lead |
| Dependency tree review | Quarterly | Security lead |

---

## Related Documentation

- [Security Policy](./security-policy.md) - Vulnerability reporting process
- [Production Checklist](../operations/production-checklist.md) - Pre-launch dependency verification
- [Threat Model](./threat-model.md) - Supply chain in threat analysis
