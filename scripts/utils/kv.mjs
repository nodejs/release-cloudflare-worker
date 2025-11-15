import Cloudflare from 'cloudflare';
import { CLOUDFLARE_ACCOUNT_ID } from '../constants.mjs';
import { KV_RETRY_LIMIT } from '../../common/limits.mjs';

export function createCloudflareClient() {
  return new Cloudflare({
    maxRetries: KV_RETRY_LIMIT,
  });
}

/**
 * @param {import('cloudflare').Cloudflare} client
 * @param {string} namespace
 * @returns {Promise<Set<string>>}
 */
export async function listKvNamespace(client, namespace) {
  /**
   * @type {Set<string>}
   */
  const keys = new Set();

  for await (const key of client.kv.namespaces.keys.list(namespace, {
    account_id: CLOUDFLARE_ACCOUNT_ID,
  })) {
    keys.add(key.name);
  }

  return keys;
}

/**
 * @param {import('cloudflare').Cloudflare} client
 * @param {string} namespace
 * @param {Map<string, object>} values
 */
export async function writeKeysToKv(client, namespace, values) {
  const keys = values.keys().toArray();

  while (keys.length) {
    // Can only write 10,000 keys at once
    const batch = keys.splice(0, 10_000);

    await client.kv.namespaces.bulkUpdate(namespace, {
      account_id: CLOUDFLARE_ACCOUNT_ID,
      body: batch.map(key => ({
        key,
        value: JSON.stringify(values.get(key)),
      })),
    });
  }
}

/**
 * Delete keys in a KV namespace
 * @param {import('cloudflare').Cloudflare} client
 * @param {string} namespace
 * @param {Array<string>} keys
 */
export async function deleteKvNamespaceKeys(client, namespace, keys) {
  while (keys.length) {
    // Can only delete 10,000 keys at once
    const batch = keys.splice(0, 10_000);

    await client.kv.namespaces.bulkDelete(namespace, {
      account_id: CLOUDFLARE_ACCOUNT_ID,
      body: batch,
    });
  }
}
