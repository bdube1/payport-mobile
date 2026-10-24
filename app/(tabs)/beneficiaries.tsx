import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Modal, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GradientScreen from '../../components/ui/GradientScreen';
import AppBar from '../../components/ui/AppBar';
import { Colors, themed } from '../../constants/colors';
import { normalizePhone, beneficiariesApi } from '../../lib/api';
import { fetchActiveBillers } from '../../lib/billers';
import { useAuthStore } from '../../store/authStore';

function detect(phone: string) {
  const n = normalizePhone(phone); const l = n.startsWith('+263') ? '0'+n.slice(4) : n; const p = l.slice(0,3);
  if (p === '077' || p === '078') return { name:'Econet', color:'#1d4ed8' };
  if (p === '071')                return { name:'NetOne', color:'#FF9800' };
  if (p === '073')                return { name:'Telecel', color:'#F44336' };
  return null;
}

export default function BeneficiariesScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [bens, setBens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'PHONE' | 'BILLS'>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number|null>(null);
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState<'PHONE' | 'BILLS'>('PHONE');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [billers, setBillers] = useState<any[]>([]);
  const [billerCode, setBillerCode] = useState('');
  const [accountRef, setAccountRef] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true); setLoadError('');
    try {
      const r = await beneficiariesApi.list();
      setBens(r.data?.data || r.data || []);
    } catch (e) {
      setLoadError('Could not load your beneficiaries. Pull down to retry.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetchActiveBillers().then(list => {
      setBillers(list);
      if (list.length > 0) setBillerCode(prev => prev || list[0].code);
    }).catch(() => {});
  }, []);

  const reset = () => { setType('PHONE'); setName(''); setPhone(''); setBillerCode(billers[0]?.code || ''); setAccountRef(''); setErr(''); setEditId(null); };
  const openEdit = (b: any) => {
    setType(b.type || 'PHONE');
    setName(b.name);
    setPhone(b.phone || '');
    setBillerCode(b.billerCode || 'ZESA');
    setAccountRef(b.accountRef || '');
    setEditId(b.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { setErr('Enter a name'); return; }

    let payload: any = { name: name.trim(), type };
    if (type === 'PHONE') {
      const norm = normalizePhone(phone);
      if (norm.length < 12) { setErr('Enter a valid Zimbabwe number'); return; }
      const net = detect(norm);
      payload = { ...payload, phone: norm, networkName: net?.name, networkColor: net?.color };
    } else {
      if (!accountRef.trim()) { setErr('Enter the account/meter number'); return; }
      const biller = billers.find(b => b.code === billerCode);
      if (!biller) { setErr('Select a biller'); return; }
      payload = { ...payload, billerCode, billerName: biller.name, accountRef: accountRef.trim() };
    }

    setSaving(true); setErr('');
    try {
      if (editId) {
        const r = await beneficiariesApi.update(editId, payload);
        const updated = r.data?.data || r.data;
        setBens(prev => prev.map(b => b.id === editId ? updated : b));
      } else {
        const r = await beneficiariesApi.create(payload);
        const created = r.data?.data || r.data;
        setBens(prev => [created, ...prev]);
      }
      setShowForm(false); reset();
    } catch (e: any) {
      setErr(e?.response?.data?.error?.message || 'Could not save — check your connection and try again');
    } finally {
      setSaving(false);
    }
  };

  const del = (id: number) => Alert.alert('Remove', 'Remove this beneficiary?', [{ text:'Cancel', style:'cancel' }, { text:'Remove', style:'destructive', onPress: async () => {
    const prev = bens;
    setBens(b => b.filter(x => x.id !== id)); // optimistic
    try { await beneficiariesApi.remove(id); } catch { setBens(prev); Alert.alert('Could not remove', 'Please try again.'); }
  }}]);

  const useBeneficiary = (item: any) => {
    if (item.type === 'BILLS') {
      router.push({ pathname: '/bills', params: { biller: item.billerCode, account: item.accountRef } });
    } else {
      router.push({ pathname: '/airtime', params: { phone: item.phone } });
    }
  };

  const filtered = bens.filter(b => filter === 'ALL' ? true : (b.type || 'PHONE') === filter);

  return (
    <GradientScreen>
      <AppBar title="Beneficiaries" rightElement={user ? (
        <TouchableOpacity onPress={() => { reset(); setShowForm(true); }} style={{ padding: 8 }}>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>+</Text>
        </TouchableOpacity>
      ) : undefined} />
      {!user ? (
        <View style={S.centre}>
          <Ionicons name="people-outline" size={44} color={Colors.textSecondary} />
          <Text style={S.emptyTitle}>Sign in to manage contacts</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={S.btn}><Text style={S.btnTxt}>Sign In</Text></TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={S.centre}><ActivityIndicator color={Colors.primary} size="large" /></View>
      ) : loadError ? (
        <View style={S.centre}>
          <Ionicons name="cloud-offline-outline" size={44} color={Colors.textSecondary} />
          <Text style={S.emptyTitle}>{loadError}</Text>
          <TouchableOpacity onPress={load} style={S.btn}><Text style={S.btnTxt}>Retry</Text></TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Filter row — Airtime/Data contacts vs Bills accounts are different shapes */}
          <View style={S.filterRow}>
            {(['ALL', 'PHONE', 'BILLS'] as const).map(f => (
              <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[S.filterChip, filter === f && S.filterChipActive]}>
                <Text style={[S.filterChipTxt, filter === f && S.filterChipTxtActive]}>
                  {f === 'ALL' ? 'All' : f === 'PHONE' ? 'Airtime & Data' : 'Bills'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {filtered.length === 0 ? (
            <View style={S.centre}>
              <Ionicons name="people-outline" size={44} color={Colors.textSecondary} />
              <Text style={S.emptyTitle}>No beneficiaries yet</Text>
              <Text style={S.emptySub}>Save phone numbers or bill accounts for quick access</Text>
              <TouchableOpacity onPress={() => { reset(); setShowForm(true); }} style={S.btn}><Text style={S.btnTxt}>+ Add Beneficiary</Text></TouchableOpacity>
            </View>
          ) : (
            <FlatList data={filtered} keyExtractor={(i) => String(i.id)} contentContainerStyle={{ padding: 12 }}
              onRefresh={load} refreshing={loading}
              renderItem={({ item }) => (
                <View style={S.card}>
                  <View style={[S.avatar, { backgroundColor: item.type === 'BILLS' ? Colors.accent : (item.networkColor || Colors.primary) }]}>
                    {item.type === 'BILLS'
                      ? <Ionicons name="receipt-outline" size={18} color="#fff" />
                      : <Text style={S.avatarTxt}>{item.name[0].toUpperCase()}</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={S.benName}>{item.name}</Text>
                    {item.type === 'BILLS' ? (
                      <>
                        <Text style={S.benPhone}>{item.accountRef}</Text>
                        <Text style={[S.benNet, { color: Colors.accent }]}>{item.billerName}</Text>
                      </>
                    ) : (
                      <>
                        <Text style={S.benPhone}>{item.phone}</Text>
                        {item.networkName && <Text style={[S.benNet, { color: item.networkColor }]}>{item.networkName}</Text>}
                      </>
                    )}
                  </View>
                  <View style={S.actions}>
                    <TouchableOpacity onPress={() => useBeneficiary(item)} style={S.topupBtn}>
                      <Text style={S.topupTxt}>{item.type === 'BILLS' ? 'Pay Bill' : 'Top Up'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => openEdit(item)} style={S.iconBtn}><Ionicons name="pencil-outline" size={16} color={Colors.textSecondary} /></TouchableOpacity>
                    <TouchableOpacity onPress={() => del(item.id)} style={S.iconBtn}><Ionicons name="trash-outline" size={16} color={Colors.red} /></TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </>
      )}

      {/* Add/Edit modal — plain View, NOT GradientScreen inside Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={S.modalRoot}>
          <View style={S.modalHeader}>
            <Text style={S.modalTitle}>{editId ? 'Edit' : 'Add'} Beneficiary</Text>
            <TouchableOpacity onPress={() => { setShowForm(false); reset(); }}><Ionicons name="close" size={22} color={Colors.textSecondary} /></TouchableOpacity>
          </View>
          <View style={S.modalBody}>
            {err ? <View style={S.errBox}><Text style={S.errTxt}>{err}</Text></View> : null}

            {/* Type selector */}
            <Text style={S.lbl}>Type</Text>
            <View style={S.typeRow}>
              <TouchableOpacity onPress={() => setType('PHONE')} style={[S.typeBtn, type === 'PHONE' && S.typeBtnActive]}>
                <Ionicons name="phone-portrait-outline" size={16} color={type === 'PHONE' ? '#fff' : Colors.primary} />
                <Text style={[S.typeBtnTxt, type === 'PHONE' && { color: '#fff' }]}>Airtime & Data</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setType('BILLS')} style={[S.typeBtn, type === 'BILLS' && S.typeBtnActive]}>
                <Ionicons name="receipt-outline" size={16} color={type === 'BILLS' ? '#fff' : Colors.primary} />
                <Text style={[S.typeBtnTxt, type === 'BILLS' && { color: '#fff' }]}>Bills</Text>
              </TouchableOpacity>
            </View>

            <Text style={S.lbl}>Name</Text>
            <TextInput value={name} onChangeText={setName} placeholder="e.g. Mum" placeholderTextColor={Colors.textSecondary} style={S.input} />

            {type === 'PHONE' ? (
              <>
                <Text style={S.lbl}>Phone Number</Text>
                <View style={S.phoneRow}>
                  <View style={S.pfx}><Text style={S.pfxTxt}>+263</Text></View>
                  <TextInput value={phone} onChangeText={setPhone} placeholder="077 123 4567" placeholderTextColor={Colors.textSecondary} keyboardType="phone-pad" style={S.phoneIn} />
                </View>
              </>
            ) : (
              <>
                <Text style={S.lbl}>Biller</Text>
                <View style={S.billerRow}>
                  {billers.map(b => (
                    <TouchableOpacity key={b.code} onPress={() => setBillerCode(b.code)} style={[S.billerChip, billerCode === b.code && S.billerChipActive]}>
                      <Text style={[S.billerChipTxt, billerCode === b.code && { color: '#fff' }]}>{b.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={S.lbl}>{billers.find(b => b.code === billerCode)?.field}</Text>
                <TextInput value={accountRef} onChangeText={setAccountRef} placeholder="Enter number" placeholderTextColor={Colors.textSecondary} style={S.input} />
              </>
            )}

            <View style={{ height: 24 }} />
            <TouchableOpacity onPress={handleSave} disabled={saving} style={[S.saveBtn, saving && { opacity: 0.6 }]}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={S.saveTxt}>{editId ? 'Save Changes' : 'Add Beneficiary'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </GradientScreen>
  );
}

const S = themed(() => ({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold', textAlign: 'center' },
  emptySub: { fontSize: 14, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular', textAlign: 'center' },
  btn: { backgroundColor: Colors.primary, borderRadius: 24, paddingHorizontal: 28, paddingVertical: 14 },
  btnTxt: { color: '#fff', fontWeight: '700', fontFamily: 'Rubik_700Bold' },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipTxt: { fontSize: 12.5, fontWeight: '700', color: Colors.textSecondary, fontFamily: 'Rubik_700Bold' },
  filterChipTxtActive: { color: '#fff' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardBg, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.borderLight, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 18, fontWeight: '700', color: '#fff', fontFamily: 'Rubik_700Bold' },
  benName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold' },
  benPhone: { fontSize: 12, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular' },
  benNet: { fontSize: 11, fontWeight: '700', fontFamily: 'Rubik_700Bold', marginTop: 2 },
  actions: { gap: 6 },
  topupBtn: { backgroundColor: Colors.primary, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  topupTxt: { color: '#fff', fontSize: 11, fontWeight: '700', fontFamily: 'Rubik_700Bold' },
  iconBtn: { padding: 6, borderRadius: 8, borderWidth: 1, borderColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  modalRoot: { flex: 1, backgroundColor: Colors.cardBg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold' },
  modalBody: { padding: 20 },
  errBox: { backgroundColor: Colors.errorBg, borderRadius: 8, padding: 12, marginBottom: 12 },
  errTxt: { color: Colors.red, fontSize: 14, fontFamily: 'Nunito_400Regular' },
  lbl: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold', marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary, backgroundColor: Colors.cardBg, fontFamily: 'Nunito_400Regular' },
  phoneRow: { flexDirection: 'row', borderWidth: 1.5, borderColor: Colors.border, borderRadius: 24, overflow: 'hidden' },
  pfx: { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.primary, justifyContent: 'center' },
  pfxTxt: { color: '#fff', fontWeight: '700', fontSize: 14, fontFamily: 'Rubik_700Bold' },
  phoneIn: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary, fontFamily: 'Nunito_400Regular' },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 24, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg },
  typeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeBtnTxt: { fontSize: 13, fontWeight: '700', color: Colors.primary, fontFamily: 'Rubik_700Bold' },
  billerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  billerChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg },
  billerChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  billerChipTxt: { fontSize: 12.5, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold' },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 24, paddingVertical: 16, alignItems: 'center' },
  saveTxt: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: 'Rubik_700Bold' },
}));
