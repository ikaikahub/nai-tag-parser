import { getAnlas, type usageRemaining } from '$lib/napi';
import { settings } from './settings.svelte';

export const account = $state({
    usage: null as usageRemaining | null,
    loading: false,
    error: '',
});

export async function refreshAccount() {
    account.error = '';
    if (!settings.apiKey) {
        account.usage = null;
        return;
    }
    account.loading = true;
    try {
        account.usage = await getAnlas(settings.apiKey);
    } catch (e) {
        account.usage = null;
        account.error = e instanceof Error ? e.message : String(e);
    } finally {
        account.loading = false;
    }
}
