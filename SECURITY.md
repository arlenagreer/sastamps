# Security Policy

## Reporting Security Vulnerabilities

The San Antonio Philatelic Association takes the security of our website seriously. If you discover a security vulnerability, please follow these steps:

### Do NOT
- Open a public GitHub issue
- Post details on social media
- Exploit the vulnerability

### DO
1. Email security details to: **loz33@hotmail.com**
2. Include "SAPA Website Security" in the subject line
3. Provide detailed information:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will acknowledge your email within 48 hours and provide regular updates on our progress.

## Security Features

Our website implements multiple security layers:

### 1. Content Security Policy (CSP)
- Strict CSP headers prevent XSS attacks
- Script sources are explicitly whitelisted
- Inline scripts use nonces where necessary

### 2. Input Validation & Sanitization
- All user inputs are validated client-side AND server-side
- Multiple sanitization layers prevent injection attacks
- Email and phone validation with strict patterns

### 3. Rate Limiting
- Contact form: 3 submissions per hour per IP
- Prevents spam and DoS attacks
- Client-side and server-side enforcement

### 4. CSRF Protection
- Token-based validation for form submissions
- Prevents cross-site request forgery

### 5. Secure Headers
```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

## Best Practices for Contributors

### When Adding Features
1. **Never trust user input** - Always validate and sanitize
2. **Use prepared statements** - If adding database functionality
3. **Escape output** - Prevent XSS when displaying user content
4. **Check dependencies** - Run `npm audit` before adding packages
5. **Follow least privilege** - Request minimal permissions

### Code Review Security Checklist
- [ ] No hardcoded secrets or API keys
- [ ] Input validation on all user data
- [ ] Output properly escaped
- [ ] No use of `eval()` or similar
- [ ] Dependencies are up-to-date
- [ ] Error messages don't expose sensitive info

### Secure Coding Examples

**Good - Input Validation:**
```javascript
function validateEmail(email) {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sanitized = email.trim().toLowerCase();
  return pattern.test(sanitized) ? sanitized : null;
}
```

**Good - Output Escaping:**
```javascript
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

**Bad - Direct DOM Manipulation:**
```javascript
// NEVER DO THIS
element.innerHTML = userInput; // XSS vulnerability!
```

## Security Maintenance

### Regular Tasks
- **Weekly**: Run `npm audit` to check for vulnerabilities
- **Monthly**: Review and update dependencies
- **Quarterly**: Security header audit
- **Annually**: Full security assessment

### Dependency Management
```bash
# Check for vulnerabilities
npm audit

# Fix automatically where possible
npm audit fix

# Update dependencies safely
npm update
```

## Known Security Considerations

### Static Site Limitations
- No server-side session management
- Form submissions require external handling
- Client-side validation must be duplicated server-side

### Third-Party Services
- Google Analytics: Privacy implications
- Font Awesome: External resource loading
- Google Fonts: External resource loading

### Mitigation Strategies
- All external resources use SRI hashes where possible
- Fallback options for blocked resources
- Privacy policy clearly states data usage

## Security Headers Configuration

### Current Implementation
Located in `security-headers.php`:
- CSP with strict directives
- XSS protection
- Clickjacking prevention
- MIME type sniffing protection

### Testing Headers
```bash
# Local testing
curl -I http://localhost:3000

# Production testing
curl -I https://sastamps.org
```

## Incident Response

If a security incident occurs:

1. **Immediate Actions**
   - Assess the scope and impact
   - Implement temporary fixes if needed
   - Document all findings

2. **Communication**
   - Notify affected users if data was compromised
   - Update security advisory
   - Thank the reporter (if applicable)

3. **Resolution**
   - Fix the vulnerability
   - Test thoroughly
   - Deploy updates
   - Post-mortem analysis

## Recognition

We appreciate security researchers who:
- Report vulnerabilities responsibly
- Allow reasonable time for fixes
- Work with us to understand issues

With permission, we will acknowledge security contributors in our:
- Security acknowledgments page
- Newsletter mentions
- Annual reports

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)

---

**Last Updated**: January 2025

For security concerns, contact: **loz33@hotmail.com**