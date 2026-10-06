// GOD MODE: Client-side Supabase stub
// Since all Auth goes through janubhai.space, and data fetching is mostly SSR,
// this just prevents client-side crashes if imported.

export const createClient = () => {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: async () => {
        window.location.href = "https://janubhai.space/auth?app=nothingness";
      }
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
          then: (res: any) => res({ data: [], error: null })
        }),
        then: (res: any) => res({ data: [], error: null })
      })
    })
  };
};
