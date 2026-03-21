export function requireEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name];
  if (!value || String(value).trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return String(value);
}

export function optionalEnv(name: keyof ImportMetaEnv, fallback: string): string {
  const value = import.meta.env[name];
  if (!value || String(value).trim() === "") {
    return fallback;
  }
  return String(value);
}
