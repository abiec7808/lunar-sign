/**
 * Robust Application Base URL resolver.
 * Handles production custom domain (sign.lunaposgeorge.co.za), Netlify deployments,
 * live incoming HTTP request headers, and filters out unconfigured/placeholder URLs like <your-site-name>.
 */
export function getAppUrl(req?: Request | null): string {
  // 1. If live incoming HTTP request is available, prioritize request origin
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

  // 2. Check explicit NEXT_PUBLIC_APP_URL
  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (
    envAppUrl &&
    !envAppUrl.includes('your-site-name') &&
    !envAppUrl.includes('<') &&
    !envAppUrl.includes('placeholder')
  ) {
    return envAppUrl.replace(/\/$/, '');
  }

  // 3. Check Netlify automatic environment variables (URL or DEPLOY_PRIME_URL)
  const netlifyUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  if (
    netlifyUrl &&
    !netlifyUrl.includes('your-site-name') &&
    !netlifyUrl.includes('<') &&
    !netlifyUrl.includes('placeholder')
  ) {
    return netlifyUrl.replace(/\/$/, '');
  }

  // 4. Default to official production domain
  return 'https://sign.lunaposgeorge.co.za';
}
