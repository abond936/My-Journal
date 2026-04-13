import { Client } from 'typesense';

let client: Client | null = null;

export function getTypesenseClient(): Client | null {
  if (client) return client;

  const host = process.env.TYPESENSE_HOST;
  const apiKey = process.env.TYPESENSE_API_KEY;
  const port = parseInt(process.env.TYPESENSE_PORT || '443', 10);
  const protocol = process.env.TYPESENSE_PROTOCOL || 'https';

  if (!host || !apiKey) return null;

  client = new Client({
    nodes: [{ host, port, protocol }],
    apiKey,
    connectionTimeoutSeconds: 5,
  });

  return client;
}

export function isTypesenseConfigured(): boolean {
  return !!(process.env.TYPESENSE_HOST && process.env.TYPESENSE_API_KEY);
}
