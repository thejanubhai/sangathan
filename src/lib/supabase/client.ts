// GOD MODE: Client-side Supabase stub

export const createClient = () => {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: async () => {
        window.location.href = "https://janubhai.space/auth?app=sangathan";
      }
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
          then: (res: any) => res({ data: [], error: null })
        }),
        then: (res: any) => res({ data: [], error: null })
      }),
      insert: async () => ({ data: null, error: null }),
      update: async () => ({ data: null, error: null }),
      delete: async () => ({ data: null, error: null })
    }),
    channel: (name: string) => ({
      on: () => ({
        subscribe: () => {}
      }),
      subscribe: () => {}
    }),
    storage: {
      from: (bucket: string) => ({
        upload: async () => ({ data: null, error: null }),
        download: async () => ({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: "" } })
      })
    }
  };
};
