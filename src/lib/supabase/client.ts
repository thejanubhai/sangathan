import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, setDoc, orderBy, limit } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

class SupabaseQueryBuilder {
  private tableName: string;
  private wheres: any[] = [];
  private orderFields: any[] = [];
  private limitCount?: number;

  constructor(table: string) {
    this.tableName = `sangathan_${table}`;
  }

  select(columns = '*') {
    return this;
  }

  eq(column: string, value: any) {
    this.wheres.push(where(column, '==', value));
    return this;
  }
  
  neq(column: string, value: any) {
    this.wheres.push(where(column, '!=', value));
    return this;
  }

  in(column: string, values: any[]) {
     this.wheres.push(where(column, 'in', values));
     return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderFields.push(orderBy(column, options?.ascending === false ? 'desc' : 'asc'));
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  async single() {
    this.limitCount = 1;
    const res = await this.execute();
    return { data: res.data?.[0] || null, error: res.error };
  }

  async maybeSingle() {
    return this.single();
  }

  async execute() {
    try {
      const collRef = collection(db, this.tableName);
      const constraints: any[] = [...this.wheres, ...this.orderFields];
      if (this.limitCount) constraints.push(limit(this.limitCount));

      const qRef = query(collRef, ...constraints);
      const snapshot = await getDocs(qRef);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      return { data, error: null };
    } catch (e: any) {
      console.error('GodMode Firestore Translation Error:', e);
      return { data: null, error: e };
    }
  }

  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export const createClient = () => {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithOAuth: async () => { if (typeof window !== 'undefined') window.location.href = "https://janubhai.space/auth?app=sangathan"; },
      signOut: async () => {
        if (typeof window !== 'undefined') window.location.href = "https://janubhai.space/auth?app=sangathan";
      }
    },
    from: (table: string) => {
      const builder = new SupabaseQueryBuilder(table);
      return {
        select: (cols?: string) => builder.select(cols),
        insert: async (data: any) => {
            try {
                const arr = Array.isArray(data) ? data : [data];
                for (const item of arr) {
                    const id = item.id || crypto.randomUUID();
                    await setDoc(doc(db, `sangathan_${table}`, id), item);
                }
                return { data: arr, error: null };
            } catch(e) {
                return { data: null, error: e };
            }
        },
        update: async (data: any) => { return { data: null, error: null }; },
        delete: async () => { return { data: null, error: null }; }
      }
    },
    channel: (name: string) => ({
      on: () => ({ subscribe: () => {} }),
      subscribe: () => {},
      removeChannel: () => {}
    }),
    removeChannel: () => {},
    storage: {
      from: (bucket: string) => ({
        upload: async () => ({ data: null, error: null }),
        download: async () => ({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
        remove: async () => ({ data: null, error: null })
      })
    }
  };
};
