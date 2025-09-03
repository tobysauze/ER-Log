// Simple Supabase integration for syncing entries across devices
// Configure values in sb-config.js

(function() {
  const url = window.SUPABASE_URL;
  const key = window.SUPABASE_ANON_KEY;

  if (!window.supabase || !url || !key) {
    console.warn('[cloud] Supabase not configured. Falling back to local-only storage.');
    window.cloud = {
      enabled: false,
      async saveEntry() { return { ok: false }; },
      async fetchEntries() { return null; },
      subscribeEntries() { /* noop */ }
    };
    return;
  }

  const client = window.supabase.createClient(url, key, {
    auth: { persistSession: false }
  });

  async function saveEntry(entry) {
    try {
      const payload = { data: entry };
      const { error } = await client.from('entries').insert(payload).select('id').single();
      if (error) throw error;
      return { ok: true };
    } catch (e) {
      console.error('[cloud] saveEntry failed', e);
      return { ok: false, error: e.message };
    }
  }

  async function fetchEntries() {
    try {
      const { data, error } = await client
        .from('entries')
        .select('id, created_at, data')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map(r => {
        const e = r.data || {};
        e.__meta = e.__meta || {};
        e.__meta.ts = new Date(r.created_at).getTime();
        e.__meta.iso = new Date(r.created_at).toISOString();
        return e;
      });
    } catch (e) {
      console.error('[cloud] fetchEntries failed', e);
      return null;
    }
  }

  function subscribeEntries(onChange) {
    try {
      const channel = client.channel('entries-stream')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'entries' }, (payload) => {
          if (typeof onChange === 'function') onChange(payload);
        })
        .subscribe();
      return () => client.removeChannel(channel);
    } catch (e) {
      console.error('[cloud] subscribeEntries failed', e);
      return () => {};
    }
  }

  window.cloud = {
    enabled: true,
    saveEntry,
    fetchEntries,
    subscribeEntries,
  };
})();


