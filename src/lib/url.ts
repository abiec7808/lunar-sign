/**
 * Robust Application Base URL resolver.
 * Defaults to live Netlify deployment (https://lunar-sign.netlify.app).
 */
export function getAppUrl(req?: Request | null, customDomain?: string | null): string {
  // 1. If live incoming HTTP request is available and valid
  if (req) {
    try {
      const proto = req.headers.get('x-forwarded-proto') || 'https';
      const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
      if (
        host &&
        !host.includes('sign.lunarpos') &&
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

  // 2. Check explicit NEXT_PUBLIC_APP_URL if not sign.lunarpos
  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (
    envAppUrl &&
    !envAppUrl.includes('sign.lunarpos') &&
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
    !netlifyUrl.includes('sign.lunarpos') &&
    !netlifyUrl.includes('your-site-name') &&
    !netlifyUrl.includes('<') &&
    !netlifyUrl.includes('placeholder')
  ) {
    return netlifyUrl.replace(/\/$/, '');
  }

  // 4. Default to official production live Netlify host
  return 'https://lunar-sign.netlify.app';
}
