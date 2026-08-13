import { lstatSync, readFileSync } from 'node:fs';

const forbiddenCredentialVariables = [
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_TOKEN',
] as const;

export function assertExternalAccountAdc(): void {
  for (const name of forbiddenCredentialVariables) {
    if (String(process.env[name] || '').trim()) {
      throw new Error(`Long-lived Google/Firebase credential variable is prohibited: ${name}`);
    }
  }

  const adcPath = String(process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();
  if (!adcPath) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS must reference a protected external-account Workload Identity Federation configuration.');
  }

  let stat;
  try {
    stat = lstatSync(adcPath);
  } catch {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS must reference a readable external-account configuration.');
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS must reference a regular non-symlinked external-account configuration.');
  }

  let config: unknown;
  try {
    config = JSON.parse(readFileSync(adcPath, 'utf8'));
  } catch {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS must contain valid external-account JSON.');
  }
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS must contain an external-account object.');
  }

  const record = config as Record<string, unknown>;
  if (record.type !== 'external_account') {
    throw new Error('Only external-account Workload Identity Federation ADC is accepted.');
  }
  for (const field of ['audience', 'subject_token_type', 'token_url']) {
    if (typeof record[field] !== 'string' || !String(record[field]).trim()) {
      throw new Error(`External-account ADC is missing required field: ${field}`);
    }
  }
  if (!record.credential_source || typeof record.credential_source !== 'object' || Array.isArray(record.credential_source)) {
    throw new Error('External-account ADC must define a credential_source object.');
  }
  for (const field of ['private_key', 'private_key_id', 'client_email']) {
    if (record[field]) {
      throw new Error(`Long-lived service-account field is prohibited in ADC configuration: ${field}`);
    }
  }
}
