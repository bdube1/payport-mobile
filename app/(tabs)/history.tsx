import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GradientScreen from '../../components/ui/GradientScreen';
import AppBar from '../../components/ui/AppBar';
import { Colors, themed } from '../../constants/colors';
import { transactionsApi, walletApi, formatAmount } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

function fmtDate(val: any) {
  if (!val) return '—';
  try {
    if (Array.isArray(val)) { const [y,mo,d]=val; return new Date(y,mo-1,d).toLocaleDateString('en-ZW',{day:'numeric',month:'short',year:'numeric'}); }
    return new Date(val).toLocaleDateString('en-ZW',{day:'numeric',month:'short'});
  } catch { return '—'; }
}

const STATUS_COLOR: Record<string,string> = { COMPLETED: Colors.green, PAYMENT_PENDING: Colors.primary, PAYMENT_FAILED: Colors.red, FULFILMENT_FAILED: Colors.red, FULFILMENT_PENDING: Colors.orange, FULFILMENT_RETRY: Colors.orange, MANUAL_FULFILMENT: Colors.orange, PAYMENT_TIMEOUT: Colors.textSecondary, REFUNDED: Colors.primary, REFUND_PENDING: Colors.primary };

const KIND: Record<string, string> = { TOPUP: 'Top-up', PAYMENT: 'Payment', P2P_OUT: 'Sent', P2P_IN: 'Received', CASH_IN: 'Cash in', CASH_OUT: 'Cash out', FX_OUT: 'Converted out', FX_IN: 'Converted in', REFUND: 'Refund' };
const METHOD: Record<string, string> = { WALLET: 'PayPort Wallet', ECOCASH: 'EcoCash', ONEMONEY: 'OneMoney', OMARI: "O'mari", INNBUCKS: 'InnBucks', ZIMSWITCH: 'Card (ZimSwitch)' };
const full = (v: any) => {
  if (!v) return '';
  try {
    const d = Array.isArray(v) ? new Date(v[0], v[1] - 1, v[2], v[3] || 0, v[4] || 0) : new Date(String(v).replace(' ', 'T'));
    return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString('en-ZW', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return String(v); }
};

function Details({ items, children }: { items: [string, any][]; children?: React.ReactNode }) {
  return (
    <View style={S.details}>
      {items.filter(([, v]) => v !== null && v !== undefined && v !== '').map(([k, v]) => (
        <View key={k} style={S.dRow}><Text style={S.dKey}>{k}</Text><Text style={S.dVal} selectable>{String(v)}</Text></View>
      ))}
      {children}
    </View>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const user   = useAuthStore((s) => s.user);
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<'payments' | 'wallet'>(params.tab === 'wallet' ? 'wallet' : 'payments');
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { if (params.tab === 'wallet' || params.tab === 'payments') setTab(params.tab); }, [params.tab]);
  const [txs,        setTxs]        = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const r = await transactionsApi.getMyHistory(0, 20);
      setTxs((r.data?.data || r.data)?.content || []);
    } catch { setError('Failed to load transactions'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { if (user) load(); else setLoading(false); }, [user]);

  return (
    <GradientScreen>
      <AppBar title="History" />
      {user ? (
        <View style={S.tabs}>
          {([['payments', 'Payments'], ['wallet', 'Wallet']] as const).map(([k, t]) => (
            <TouchableOpacity key={k} onPress={() => setTab(k)} style={[S.tab, tab === k && S.tabOn]}>
              <Text style={[S.tabTxt, tab === k && { color: '#fff' }]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      {user && tab === 'wallet' ? <WalletHistory /> : !user ? (
        <View style={S.centre}>
          <Ionicons name="time-outline" size={44} color={Colors.textSecondary} />
          <Text style={S.emptyTitle}>Sign in to view history</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={S.btn}><Text style={S.btnTxt}>Sign In</Text></TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={S.centre}><ActivityIndicator color={Colors.primary} size="large" /></View>
      ) : error ? (
        <View style={S.centre}>
          <Text style={S.emptyTitle}>{error}</Text>
          <TouchableOpacity onPress={() => load()} style={S.btn}><Text style={S.btnTxt}>Retry</Text></TouchableOpacity>
        </View>
      ) : txs.length === 0 ? (
        <View style={S.centre}>
          <Ionicons name="time-outline" size={44} color={Colors.textSecondary} />
          <Text style={S.emptyTitle}>No transactions yet</Text>
        </View>
      ) : (
        <FlatList
          data={txs} keyExtractor={(item) => item.reference}
          contentContainerStyle={{ padding: 12 }}
          onRefresh={() => load(true)} refreshing={refreshing}
          renderItem={({ item }) => {
            const sc = STATUS_COLOR[item.status] || Colors.textSecondary;
            return (
              <TouchableOpacity onPress={() => setOpen(open === item.reference ? null : item.reference)} style={S.card} activeOpacity={0.85}>
                <View style={S.cardRow}>
                  <Text style={S.txName} numberOfLines={1}>{item.productName || 'Transaction'}</Text>
                  <Text style={[S.txAmount, { color: Colors.primary }]}>{formatAmount(item.totalCents ?? item.amountCents, item.currency)}</Text>
                </View>
                <View style={S.cardRow}>
                  <Text style={S.txDate}>{item.toName || item.recipientIdentifier}  ·  {fmtDate(item.createdAt)}</Text>
                  <Text style={[S.txStatus, { color: sc }]}>{item.status.replace(/_/g,' ')}</Text>
                </View>
                {open === item.reference ? (
                  <Details items={[['Reference', item.reference], ['Trxn Type', item.productName], ['To', item.toName || item.recipientIdentifier], ['Amount', formatAmount(item.totalCents ?? item.amountCents, item.currency)],
                    ['Paid with', METHOD[item.paymentMethodCode] || item.paymentMethodCode], ['Status', item.status.replace(/_/g, ' ')], ['Date', full(item.createdAt || item.initiatedAt)],
                    ['Token', item.voucherToken || item.token]]}>
                    <TouchableOpacity onPress={() => router.push(`/status/${item.reference}`)}><Text style={S.link}>Track this order ›</Text></TouchableOpacity>
                  </Details>
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </GradientScreen>
  );
}

function WalletHistory() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [wallets, setWallets] = useState<any[]>([]);
  const [ccy, setCcy] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    try {
      const r = await walletApi.list();
      const ws = r.data?.data?.wallets || [];
      setWallets(ws);
      const all = await Promise.all(ws.map((w: any) => walletApi.statement(w.walletRef, 200)
        .then((x) => (x.data?.data || []).map((o: any) => ({ ...o, walletRef: w.walletRef }))).catch(() => [])));
      setRows(all.flat().sort((a: any, b: any) => String(b.created_at).localeCompare(String(a.created_at))));
    } catch { setRows([]); }
    finally { setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  if (rows === null) return <View style={S.centre}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  const shown = rows.filter((r) => !ccy || r.currency === ccy);
  return (
    <FlatList
      data={shown} keyExtractor={(r) => r.op_ref + r.kind + r.walletRef}
      contentContainerStyle={{ padding: 12 }}
      onRefresh={() => { setRefreshing(true); load(); }} refreshing={refreshing}
      ListHeaderComponent={wallets.length > 1 ? (
        <View style={[S.tabs, { paddingHorizontal: 0, paddingTop: 0 }]}>
          {['', ...wallets.map((w) => w.currency)].map((c) => (
            <TouchableOpacity key={c || 'all'} onPress={() => setCcy(c)} style={[S.tab, ccy === c && S.tabOn]}><Text style={[S.tabTxt, ccy === c && { color: '#fff' }]}>{c || 'All'}</Text></TouchableOpacity>
          ))}
        </View>
      ) : null}
      ListEmptyComponent={<View style={S.centre}><Text style={S.emptyTitle}>{wallets.length ? 'No wallet transactions yet' : 'No wallet yet'}</Text></View>}
      renderItem={({ item: r }) => {
        const id = r.op_ref + r.kind + r.walletRef;
        const cr = r.direction === 'CR';
        return (
          <TouchableOpacity onPress={() => setOpen(open === id ? null : id)} style={S.card} activeOpacity={0.85}>
            <View style={[S.cardRow, { alignItems: 'center' }]}>
              <View style={[S.dir, { backgroundColor: cr ? 'rgba(52,173,84,0.12)' : 'rgba(6,163,218,0.1)' }]}>
                <Ionicons name={cr ? 'arrow-down' : 'arrow-up'} size={18} color={cr ? Colors.green : Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.txName}>{KIND[r.kind] || r.kind}</Text>
                <Text style={S.txDate} numberOfLines={1}>{full(r.created_at)}{(r.to_name || r.counterparty) ? `  ·  ${r.to_name || r.counterparty}` : ''}</Text>
              </View>
              <Text style={[S.txAmount, { color: cr ? Colors.green : Colors.textPrimary }]}>{cr ? '+' : '−'}{formatAmount(r.amount_minor, r.currency)}</Text>
            </View>
            {open === id ? <Details items={[['Trxn Type', KIND[r.kind] || r.kind], ['Amount', `${cr ? '+' : '−'}${formatAmount(r.amount_minor, r.currency)}`], ['With', r.to_name || r.counterparty],
              ['Reference', r.reference || r.op_ref], ['Wallet', `${r.currency} · ${r.walletRef}`], ['Date', full(r.created_at)]]} /> : null}
          </TouchableOpacity>
        );
      }}
    />
  );
}

const S = themed(() => ({
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 12 },
  tab: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg },
  tabOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabTxt: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold' },
  details: { marginTop: 10, paddingTop: 6, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  dRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, gap: 12 },
  dKey: { fontSize: 13, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular' },
  dVal: { flex: 1, textAlign: 'right', fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  link: { color: Colors.primary, fontWeight: '700', marginTop: 8 },
  dir: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold', textAlign: 'center', marginBottom: 20 },
  btn: { backgroundColor: Colors.primary, borderRadius: 24, paddingHorizontal: 32, paddingVertical: 14 },
  btnTxt: { color: '#fff', fontWeight: '700', fontFamily: 'Rubik_700Bold', fontSize: 15 },
  card: { backgroundColor: Colors.cardBg, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.borderLight },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  txName: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold' },
  txAmount: { fontSize: 15, fontWeight: '700', fontFamily: 'Rubik_700Bold' },
  txDate: { flex: 1, fontSize: 12, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular' },
  txStatus: { fontSize: 12, fontWeight: '700', fontFamily: 'Rubik_700Bold' },
}));
