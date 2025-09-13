---
name: 🔒 Security: CI/CD Workflow Security Hardening
about: Strengthen CI/CD workflow security configuration and permissions
title: 'Security: Harden CI/CD workflows against advanced attack vectors'
labels: ['security', 'ci', 'workflow', 'medium-priority']
assignees: []
---

## Security Issue: CI/CD Workflow Security Hardening

### Summary
While the current CI/CD workflows implement some security best practices, there are additional hardening measures that could prevent sophisticated supply chain attacks and improve overall security posture.

### Current Security Analysis

#### Positive Security Measures ✅
- Uses `step-security/harden-runner` with egress policy restrictions
- Pins GitHub Actions to specific commit SHAs (good practice)
- Separates staging and production deployments
- Implements deployment failure notifications
- Uses CodeQL for static analysis
- Implements dependency review on PRs

#### Areas for Improvement ⚠️
- Missing explicit workflow permissions (defaults to broad permissions)
- No protection against fork pull request attacks
- Long-lived API tokens instead of OIDC
- No supply chain security attestation
- Missing workflow run provenance
- No secrets scanning in CI

### Potential Attack Vectors

#### 1. Malicious Fork Pull Requests
- **Scenario**: Attacker creates fork, modifies workflows, opens PR
- **Risk**: Could extract secrets or modify deployment process
- **Likelihood**: Medium
- **Impact**: Critical (supply chain compromise)

#### 2. Compromised Dependencies During CI
- **Scenario**: Malicious npm package runs during `npm install` in CI
- **Risk**: Could exfiltrate secrets or modify build output
- **Likelihood**: Medium-High
- **Impact**: Critical

#### 3. GitHub Actions Supply Chain Attack
- **Scenario**: Compromised third-party action executes malicious code
- **Risk**: Full CI environment compromise
- **Likelihood**: Low-Medium
- **Impact**: Critical

#### 4. Privilege Escalation
- **Scenario**: Workflows with excessive permissions exploited
- **Risk**: Unauthorized repository modifications or secret access
- **Likelihood**: Medium
- **Impact**: High

### Recommended Security Hardening

#### High Priority

##### 1. Implement Explicit Workflow Permissions
```yaml
permissions:
  contents: read
  deployments: write
  id-token: write  # For OIDC
```

##### 2. Add Fork PR Protection
```yaml
# Only run on approved PRs from forks
if: github.event.pull_request.head.repo.full_name == github.repository || contains(github.event.label.name, 'safe to test')
```

##### 3. Implement OIDC Authentication
- Replace `CF_API_TOKEN` with OIDC token authentication
- Reduces long-lived secret exposure risk
- Provides better audit trail

##### 4. Add Secrets Scanning
```yaml
- name: Run Secrets Scan
  uses: trufflesecurity/trufflehog@main
  with:
    path: ./
    base: main
    head: HEAD
```

#### Medium Priority

##### 5. Enhanced Supply Chain Security
```yaml
- name: Generate SLSA Provenance
  uses: slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml@v1.7.0
```

##### 6. Implement Workflow Attestation
- Sign workflow runs with Sigstore
- Create verifiable supply chain attestations
- Enable verification of deployment provenance

##### 7. Add Runtime Security Monitoring
```yaml
- name: Monitor Runtime Security
  uses: step-security/harden-runner@v2
  with:
    egress-policy: audit  # More restrictive than current 'block'
    disable-sudo: true
    disable-file-monitoring: false
```

#### Low Priority

##### 8. Implement Branch Protection Rules
- Require status checks to pass
- Require up-to-date branches
- Require signed commits from maintainers
- Dismiss stale reviews on new commits

##### 9. Add Deployment Environment Protection
```yaml
environment:
  name: production
  url: https://dist.nodejs.org
```

##### 10. Enhanced Monitoring and Alerting
- Monitor for unusual workflow execution patterns
- Alert on failed security checks
- Track deployment frequency and patterns

### Specific Workflow Improvements

#### deploy.yml
```yaml
# Add explicit permissions
permissions:
  contents: read
  deployments: write
  id-token: write

# Add environment protection for production
environment: 
  name: ${{ github.event_name == 'workflow_dispatch' && 'production' || 'staging' }}

# Replace API token with OIDC
- name: Deploy with OIDC
  uses: cloudflare/wrangler-action@v3
  with:
    # Remove: apiToken: ${{ secrets.CF_API_TOKEN }}
    accountId: ${{ secrets.CF_ACCOUNT_ID }}
    command: deploy --env ${{ github.event_name == 'workflow_dispatch' && 'prod' || 'staging' }}
```

#### test.yml
```yaml
# Add fork protection
if: |
  github.event.pull_request.head.repo.full_name == github.repository ||
  contains(github.event.label.name, 'safe to test')

# Add explicit permissions
permissions:
  contents: read
  checks: write
  pull-requests: write
```

#### New: security-scan.yml
```yaml
name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # Weekly

permissions:
  contents: read
  security-events: write

jobs:
  secrets-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Run Trufflehog
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
```

### Implementation Plan

#### Phase 1: Critical Security (Week 1)
- [ ] Add explicit permissions to all workflows
- [ ] Implement fork PR protection
- [ ] Add secrets scanning workflow
- [ ] Update step-security/harden-runner configuration

#### Phase 2: Authentication Hardening (Week 2)
- [ ] Implement Cloudflare OIDC authentication
- [ ] Remove long-lived API tokens
- [ ] Add environment protection for production
- [ ] Test new authentication flow

#### Phase 3: Supply Chain Security (Week 3)
- [ ] Implement SLSA provenance generation
- [ ] Add workflow attestation
- [ ] Enhance dependency monitoring
- [ ] Add build reproducibility measures

#### Phase 4: Monitoring and Alerting (Week 4)
- [ ] Implement advanced monitoring
- [ ] Add security metrics collection
- [ ] Create incident response automation
- [ ] Document new security procedures

### Testing and Validation

#### Security Testing Checklist
- [ ] Test fork PR protection (create test fork)
- [ ] Verify OIDC authentication works
- [ ] Confirm secrets scanning catches test secrets
- [ ] Validate restricted permissions don't break workflows
- [ ] Test incident response procedures

#### Rollback Plan
- Keep current workflows as backup
- Implement changes incrementally
- Test each change in isolation
- Have immediate rollback capability for production

### References
- [GitHub Actions Security Hardening](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [SLSA Supply Chain Framework](https://slsa.dev/)
- [OpenSSF Scorecard](https://github.com/ossf/scorecard)
- [Cloudflare OIDC Documentation](https://developers.cloudflare.com/workers/wrangler/ci-cd/#oidc-authentication)