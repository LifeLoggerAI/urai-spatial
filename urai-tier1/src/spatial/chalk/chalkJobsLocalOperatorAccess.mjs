// Only for an isolated localhost emulator. Never accepts live credentials.
const denied = reason => { throw new Error('CHALK_JOBS_LOCAL_LOGIN_' + reason); };
export function assertChalkJobsLocalOperatorLogin({ hostname, email, password }) {
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname)) denied('ORIGIN');
  if (typeof email !== 'string' || email !== email.trim() || email.length < 6 ||
      email.length > 254 || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,24}$/.test(email))
    denied('EMAIL');
  if (typeof password !== 'string' || password.length < 6 || password.length > 256 ||
      /[\x00-\x1f\x7f]/.test(password)) denied('PASSWORD');
  // Never echo or copy login values into logs, model context, or engineering jobs.
  return true;
}
export function assertChalkJobsLocalOrigin(hostname) {
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname)) denied('ORIGIN');
  return true;
}
