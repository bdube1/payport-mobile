import { useEffect, useState } from 'react';
import api, { walletApi } from './api';
import { useAuthStore } from '../store/authStore';

export type Quote = { chargeCents: number; taxCents: number; totalCents: number };

/** The customer charge for a product payment (set in Limits & Charges), shown before paying. */
export function useCharge(product: string | null | undefined, currency: string, amountCents: number): Quote | null {
  const [q, setQ] = useState<Quote | null>(null);
  useEffect(() => {
    setQ(null);
    if (!product || !currency || !amountCents) return undefined;
    const t = setTimeout(() => {
      api.get('/api/v1/charges/quote', { params: { product, currency, amountCents, channel: 'MOB' } })
        .then((r) => setQ(r.data?.data || null)).catch(() => {});
    }, 350);
    return () => clearTimeout(t);
  }, [product, currency, amountCents]);
  return q;
}

/** Wallet balances of the signed-in customer, by currency. */
export function useWalletBalances(): Record<string, number> {
  const user = useAuthStore((s) => s.user);
  const [b, setB] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!user) return;
    walletApi.list().then((r) => {
      const out: Record<string, number> = {};
      for (const w of r.data?.data?.wallets || []) out[w.currency] = w.balanceMinor;
      setB(out);
    }).catch(() => {});
  }, [user]);
  return b;
}

/** The option's name ("PayPort Wallet" for the wallet; balances are shown only on the home screen). */
export function methodLabel(m: { code: string; name: string }) {
  return m.code === 'WALLET' ? 'PayPort Wallet' : m.name;
}
