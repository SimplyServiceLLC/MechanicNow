# Security Policy

## Supported Versions

We currently support the following versions of MechanicNow with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of MechanicNow seriously. If you discover a security vulnerability, please follow these steps:

### How to Report

1. **DO NOT** open a public GitHub issue for security vulnerabilities
2. Email security reports to: [your-security-email@domain.com]
3. Include the following information:
   - Description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Response Time**: We aim to acknowledge receipt within 48 hours
- **Updates**: You'll receive updates on the status every 5-7 days
- **Disclosure**: We follow a coordinated disclosure process
  - We'll work with you to understand and validate the issue
  - Once fixed, we'll credit you in our security advisory (unless you prefer to remain anonymous)
  - We aim to release patches within 30 days for critical issues

### Security Update Process

- **Accepted vulnerabilities**: We'll develop a fix, test it, and release a security patch
- **Declined reports**: We'll explain why the issue doesn't constitute a security vulnerability

## Security Best Practices for Contributors

- Never commit sensitive data (API keys, passwords, tokens)
- Keep dependencies up to date
- Follow secure coding practices
- Use environment variables for configuration
- Enable two-factor authentication on your GitHub account

## Security Features

This repository uses:
- Dependabot for dependency updates
- Secret scanning to prevent credential leaks
- Code scanning for vulnerability detection

Thank you for helping keep MechanicNow secure!
