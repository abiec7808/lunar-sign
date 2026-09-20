/**
 * Robust Application Base URL resolver.
 * Handles production custom domain (sign.lunarposgeorge.co.za), organization custom domains,
 * live incoming HTTP request headers, Netlify deployments, and environment variables.
 */
export function getAppUrl(req?: Request | null, customDomain?: string | null): string {
  // 1. If an explicit organization custom domain is configured, use it
  if (customDomain && customDomain.trim().length > 3) {
    const clean = customDomain
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/$/, '');
    if (
      !clean.includes('your-site-name') &&
      !clean.includes('<') &&
      !clean.includes('>') &&
      !clean.includes('placeholder') &&
      !clean.includes('undefined')
    ) {
      return `https://${clean}`;
    }
  }

  // 2. If live incoming HTTP request is available, prioritize request origin
  if (req) {
    try {
      const proto = req.headers.get('x-forwarded-proto') || 'https';
      const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
      if (
        host &&
        !host.includes('your-site-name') &&
        !host.includes('<') &&
        !host.includes('>') &&
        !host.includes('undefined')
      ) {
        return `${proto}://${host}`.replace(/\/$/, '');
      }
    } catch (e) {
      // Fall through to environment variables
    }
  }

  // 3. Check explicit NEXT_PUBLIC_APP_URL
  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (
    envAppUrl &&
    !envAppUrl.includes('your-site-name') &&
    !envAppUrl.includes('<') &&
    !envAppUrl.includes('placeholder')
  ) {
    return envAppUrl.replace(/\/$/, '');
  }

  // 4. Check Netlify automatic environment variables (URL or DEPLOY_PRIME_URL)
  const netlifyUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  if (
    netlifyUrl &&
    !netlifyUrl.includes('your-site-name') &&
    !netlifyUrl.includes('<') &&
    !netlifyUrl.includes('placeholder')
  ) {
    return netlifyUrl.replace(/\/$/, '');
  }

  // 5. Default to official production domain
  return 'https://sign.lunarposgeorge.co.za';
}
