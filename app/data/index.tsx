import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal, FlatList, Image } from 'react-native';
import { useRouter } from 'expo-router';
import GradientScreen from '../../components/ui/GradientScreen';
import AppBar from '../../components/ui/AppBar';
import * as Haptics from 'expo-haptics';
import { Colors, themed } from '../../constants/colors';
import { useCharge, methodLabel } from '../../lib/useCharges';
import { productsApi, startPayment, paymentError, normalizePhone, formatAmount, generateReference, BASE_URL, visibleMethods } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { authenticateWithBiometric, isBiometricAvailable } from '../../lib/biometric';
import { isBiometricEnabled } from '../../lib/auth';

const NETWORKS = [
  { code: 'ECONET',  name: 'Econet',  color: '#1d4ed8' },
  { code: 'NETONE',  name: 'NetOne',  color: '#FF9800' },
  { code: 'TELECEL', name: 'Telecel', color: '#F44336' },
];

export default function DataScreen() {
  const router = useRouter();
  const [network, setNetwork] = useState('');
  const [currency, setCurrency] = useState('');
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [bundles, setBundles] = useState<any[]>([]);
  const [filteredBundles, setFilteredBundles] = useState<any[]>([]);
  const [bundle, setBundle] = useState<any>(null);
  const [bundlesLoading, setBundlesLoading] = useState(false);
  const [recipientPhone, setRecipientPhone] = useState('');
  const [detectedNet, setDetectedNet] = useState<any>(null);
  const [netLoading, setNetLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [walletPin, setWalletPin] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [logoError, setLogoError] = useState<Record<string, boolean>>({});

  // Logos are managed centrally in the ops back office and served per product —
  // same source of truth as the website. Falls back to no image if unset/broken.
  const getLogoUrl = (productCode: string) => {
    const p = products.find((x: any) => x.code === productCode);
    return p?.logoUrl ? `${BASE_URL}${p.logoUrl}` : null;
  };
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Category state for Econet bundles
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // Dropdown state
  const [showBundleDropdown, setShowBundleDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ y: 0, width: 0 });
  const dropdownButtonRef = useRef<View>(null);

  useEffect(() => {
    productsApi.getAll().then(r => setProducts((r.data?.data || r.data || []).filter((p: any) => p.category === 'DATA' && p.isActive))).catch(() => {});
    productsApi.getPaymentMethods().then(r => { const m = visibleMethods((r.data?.data || r.data || []).filter((m: any) => m.isActive), !!useAuthStore.getState().user); setPaymentMethods(m); if (m.length > 0) setPaymentMethod(m[0].code); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!network) return;
    const prod = products.find((p: any) => p.code === `DATA_${network}`);
    const active = prod?.enabledCurrencies?.filter((c: any) => c.isActive !== false).map((c: any) => c.currency) || ['USD'];
    setCurrencies(active);
    if (active.length === 1) setCurrency(active[0]); else setCurrency('');
    setBundles([]); 
    setBundle(null);
    setCategories([]);
    setSelectedCategory('');
    setShowBundleDropdown(false);
  }, [network, products]);

  // Fetch bundles - with special handling for Econet
  useEffect(() => {
    if (!network || !currency) return;
    
    setBundlesLoading(true); 
    setBundles([]); 
    setBundle(null);
    setCategories([]);
    setSelectedCategory('');
    setShowBundleDropdown(false);
    
    // For Econet, use the bundle endpoint (routed through the shared, authenticated
    // api client — this used to hit a hardcoded localhost URL directly, which
    // meant it could never actually work outside of local development).
    // Every network uses the same catalogue as the web and USSD: the bundles switched on in ops.
    {
      const fetchEconetBundles = async () => {
        try {
          const response = await productsApi.getBundles(network, currency);

          const bundleData = response.data || [];
          const formattedBundles = bundleData.map((b: any) => ({
            name: b.bundleName,
            amountCents: Math.round(b.priceValue * 100),
            cents: Math.round(b.priceValue * 100),
            dataSize: b.dataVolume,
            validity: b.validity || b.description,
            bundleCode: b.bundleCode,
            category: b.category || 'Other'
          }));
          
          setBundles(formattedBundles);
          
          // Extract unique categories
          const categoryMap: {[key: string]: boolean} = {};
          formattedBundles.forEach((b: any) => {
            if (b.category) {
              categoryMap[b.category] = true;
            }
          });
          const uniqueCategories = Object.keys(categoryMap);
          setCategories(uniqueCategories);

          if (uniqueCategories.length > 0) {
            setSelectedCategory(uniqueCategories[0]);
          }
          
        } catch (err) {
          console.error('Failed to load bundles:', err);
        } finally {
          setBundlesLoading(false);
        }
      };
      fetchEconetBundles();
    }
  }, [network, currency]);

  // Filter bundles by category
  useEffect(() => {
    if (bundles.length > 0) {
      if (network === 'ECONET' && selectedCategory) {
        const filtered = bundles.filter(b => b.category === selectedCategory);
        setFilteredBundles(filtered);
        // If current selected bundle is not in filtered list, clear it
        if (bundle && !filtered.find(b => b.bundleCode === bundle.bundleCode)) {
          setBundle(null);
        }
      } else {
        setFilteredBundles(bundles);
      }
    } else {
      setFilteredBundles([]);
    }
  }, [bundles, selectedCategory, network]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setDetectedNet(null);
    const norm = normalizePhone(recipientPhone);
    if (norm.length < 12) return;
    debounceRef.current = setTimeout(async () => {
      setNetLoading(true);
      try { const r = await productsApi.detectNetwork(norm); setDetectedNet(r.data?.data || r.data); }
      catch {} finally { setNetLoading(false); }
    }, 500);
  }, [recipientPhone]);

  const recipientValid = !!detectedNet && detectedNet.networkCode === network;
  const pm = paymentMethods.find((m: any) => m.code === paymentMethod);

  const handleReview = () => {
    setError('');
    if (!network) { setError('Select a network'); return; }
    if (!bundle) { setError('Select a bundle'); return; }
    if (normalizePhone(recipientPhone).length < 12) { setError('Enter the recipient number'); return; }
    if (!recipientValid) { setError(`Number is ${detectedNet?.networkName || 'unknown'} — must match ${network}`); return; }
    if (!paymentMethod) { setError('Select a payment method'); return; }
    if (paymentMethod === 'WALLET' ? walletPin.length < 4 : normalizePhone(paymentPhone).length < 12) { setError(paymentMethod === 'WALLET' ? 'Enter your PIN' : 'Enter your wallet number'); return; }
    setShowConfirm(true);
  };

  const handlePay = async () => {
    if (await isBiometricAvailable() && await isBiometricEnabled()) {
      const r = await authenticateWithBiometric('Confirm data bundle'); if (!r.success) { setShowConfirm(false); return; }
    }
    setLoading(true);
    const ref = generateReference('MOB');
    const me = useAuthStore.getState().user;
    const payPhone = paymentMethod === 'WALLET' && me ? normalizePhone(me.phone) : normalizePhone(paymentPhone);
    try {
      await startPayment({ 
        reference: ref, 
        productTypeCode: `DATA_${network}`, 
        recipientIdentifier: normalizePhone(recipientPhone), 
        amountCents: bundle.amountCents, 
        currency, 
        customerPhone: payPhone, 
        channel: 'MOB', 
        productConfig: JSON.stringify({ bundleCode: bundle.bundleCode }) 
      }, { paymentMethodCode: paymentMethod, customerPhone: payPhone, pin: walletPin });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowConfirm(false); router.push(`/processing/${ref}`);
    } catch (e: any) {
      setError(paymentError(e).message); setLoading(false); setShowConfirm(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleSelectBundle = (selectedBundle: any) => {
    setBundle(selectedBundle);
    setShowBundleDropdown(false);
    setError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const openDropdown = () => {
    if (dropdownButtonRef.current) {
      dropdownButtonRef.current.measure((x, y, width, height, pageX, pageY) => {
        setDropdownPosition({ y: pageY + height, width });
        setShowBundleDropdown(true);
      });
    }
  };

  const quote = useCharge(network ? `DATA_${network}` : null, currency, bundle?.amountCents || 0);
  const payTotal = quote ? quote.totalCents : (bundle?.amountCents || 0);

  return (
    <GradientScreen>
      <AppBar title="Data Bundles" showBack />
      <ScrollView 
        style={S.scroll} 
        keyboardShouldPersistTaps="handled" 
        showsVerticalScrollIndicator={false}
      >
        <View style={S.body}>
          {error !== '' && <View style={S.err}><Text style={S.errTxt}>{error}</Text></View>}

          {/* 1. Network */}
          <Text style={S.lbl}>Select Network</Text>
          <View style={S.networkRow}>
            {NETWORKS.map(n => {
              const logoUrl = getLogoUrl(`DATA_${n.code}`);
              const showLogo = logoUrl && !logoError[n.code];
              return (
                <TouchableOpacity
                  key={n.code}
                  onPress={() => {
                    setNetwork(n.code);
                    setError('');
                    setShowBundleDropdown(false);
                  }}
                  style={[S.networkBtn, network === n.code && { backgroundColor: n.color, borderColor: n.color }]}
                >
                  {showLogo && (
                    <Image
                      source={{ uri: logoUrl }}
                      style={S.networkLogo}
                      resizeMode="contain"
                      onError={() => setLogoError(p => ({ ...p, [n.code]: true }))}
                    />
                  )}
                  <Text style={[S.networkBtnTxt, network === n.code && { color: '#fff' }]}>{n.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 2. Currency */}
          {currencies.length > 0 && (
            <>
              <Text style={S.lbl}>Currency</Text>
              <View style={S.chipRow}>
                {currencies.map(c => (
                  <TouchableOpacity 
                    key={c} 
                    onPress={() => {
                      setCurrency(c); 
                      setBundle(null);
                      setShowBundleDropdown(false);
                    }} 
                    style={[S.chip, currency === c && S.chipActive]}
                  >
                    <Text style={[S.chipTxt, currency === c && S.chipActiveTxt]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* 3. Categories - Only for Econet with multiple categories */}
          {network === 'ECONET' && categories.length > 1 && (
            <>
              <Text style={S.lbl}>Data Categories</Text>
              <View style={S.chipRow}>
                {categories.map(cat => (
                  <TouchableOpacity 
                    key={cat} 
                    onPress={() => {
                      setSelectedCategory(cat);
                      setBundle(null);
                      setShowBundleDropdown(false);
                    }} 
                    style={[S.chip, selectedCategory === cat && S.chipActive]}
                  >
                    <Text style={[S.chipTxt, selectedCategory === cat && S.chipActiveTxt]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* 4. Bundles - Dropdown */}
          {currency !== '' && (
            <>
              <Text style={S.lbl}>
                {network === 'ECONET' && selectedCategory ? `${selectedCategory} Bundles` : 'Select Bundle'}
              </Text>
              {bundlesLoading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <ActivityIndicator color={Colors.primary} size="small" />
                  <Text style={{ fontSize: 14, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular' }}>Loading bundles...</Text>
                </View>
              ) : filteredBundles.length === 0 ? (
                <Text style={{ fontSize: 14, color: Colors.red, fontFamily: 'Nunito_400Regular', marginBottom: 8 }}>
                  No bundles available
                </Text>
              ) : (
                <View>
                  {/* Dropdown trigger button */}
                  <TouchableOpacity 
                    ref={dropdownButtonRef}
                    onPress={openDropdown}
                    style={[S.dropdownButton, bundle && S.dropdownButtonActive]}
                    activeOpacity={0.7}
                  >
                    <Text style={[S.dropdownButtonText, bundle && S.dropdownButtonTextActive]}>
                      {bundle ? bundle.name : 'Select a bundle'}
                    </Text>
                    <Text style={[S.dropdownArrow, showBundleDropdown && S.dropdownArrowOpen]}>▼</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {/* 5. Recipient */}
          {network && (
            <>
              <Text style={S.lbl}>Recipient Number</Text>
              <View style={[S.phoneRow, recipientPhone.length > 0 && (recipientValid ? { borderColor: Colors.green } : detectedNet ? { borderColor: Colors.red } : {})]}>
                <View style={S.pfx}><Text style={S.pfxTxt}>+263</Text></View>
                <TextInput 
                  value={recipientPhone} 
                  onChangeText={setRecipientPhone} 
                  
                  placeholderTextColor={Colors.textSecondary} 
                  keyboardType="phone-pad" 
                  style={S.phoneIn} 
                />
                {netLoading && <ActivityIndicator color={Colors.primary} size="small" style={{ marginRight: 12 }} />}
              </View>
              {detectedNet && !netLoading && (
                <Text style={{ fontSize: 13, color: recipientValid ? Colors.green : Colors.red, fontFamily: 'Nunito_400Regular', marginBottom: 4 }}>
                  {recipientValid ? `✓ ${detectedNet.networkName} — correct` : `✗ ${detectedNet.networkName} — must match ${network}`}
                </Text>
              )}
            </>
          )}

          {/* 6. Payment method */}
          {network && paymentMethods.length > 0 && (
            <>
              <Text style={S.lbl}>Payment Method</Text>
              <View style={S.chipRow}>
                {paymentMethods.map((m: any) => (
                  <TouchableOpacity 
                    key={m.code} 
                    onPress={() => setPaymentMethod(m.code)} 
                    style={[S.chip, paymentMethod === m.code && S.chipActive]}
                  >
                    <Text style={[S.chipTxt, paymentMethod === m.code && S.chipActiveTxt]}>{methodLabel(m)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* 7. Wallet */}
          {network && (
            <>
              {paymentMethod === 'WALLET' && <><Text style={S.lbl}>Wallet PIN</Text><TextInput value={walletPin} onChangeText={t => setWalletPin(t.replace(/\D/g, ''))} placeholder="Your PayPort PIN" placeholderTextColor={Colors.textSecondary} keyboardType="number-pad" secureTextEntry maxLength={6} style={{ borderWidth: 1.5, borderColor: Colors.border, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary, backgroundColor: Colors.cardBg, marginBottom: 4 }} /></>}
              {paymentMethod !== 'WALLET' && <><Text style={S.lbl}>Payment Wallet Number</Text>
              <View style={S.phoneRow}>
                <View style={S.pfx}><Text style={S.pfxTxt}>+263</Text></View>
                <TextInput 
                  value={paymentPhone} 
                  onChangeText={setPaymentPhone} 
                  placeholder="Wallet for USSD prompt" 
                  placeholderTextColor={Colors.textSecondary} 
                  keyboardType="phone-pad" 
                  style={S.phoneIn} 
                />
              </View></>}
              <TouchableOpacity style={S.btnPrimary} onPress={handleReview}>
                <Text style={S.btnTxt}>Confirm and Pay</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Dropdown Modal */}
      <Modal
        visible={showBundleDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBundleDropdown(false)}
      >
        <TouchableOpacity 
          style={S.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowBundleDropdown(false)}
        >
          <View style={[S.dropdownModal, { top: dropdownPosition.y, width: dropdownPosition.width }]}>
            <FlatList
              data={filteredBundles}
              keyExtractor={(item, index) => item.bundleCode || index.toString()}
              style={{ maxHeight: 300 }}
              showsVerticalScrollIndicator={true}
              renderItem={({ item, index }) => (
                <TouchableOpacity 
                  onPress={() => handleSelectBundle(item)}
                  style={[
                    S.dropdownOption,
                    bundle?.bundleCode === item.bundleCode && S.dropdownOptionActive,
                    index === filteredBundles.length - 1 && { borderBottomWidth: 0 }
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[S.dropdownOptionText, bundle?.bundleCode === item.bundleCode && S.dropdownOptionTextActive]}>
                      {item.name}
                    </Text>
                    {(item.dataSize || item.validity) && (
                      <Text style={S.dropdownOptionDetail}>
                        {item.dataSize || ''}{item.dataSize && item.validity ? ' · ' : ''}{item.validity || ''}
                      </Text>
                    )}
                  </View>
                  <Text style={[S.dropdownOptionPrice, bundle?.bundleCode === item.bundleCode && S.dropdownOptionPriceActive]}>
                    {formatAmount(item.amountCents, currency)}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Confirm Modal */}
      <Modal visible={showConfirm} transparent animationType="slide" onRequestClose={() => setShowConfirm(false)}>
        <TouchableOpacity 
          style={S.overlay} 
          activeOpacity={1} 
          onPress={() => setShowConfirm(false)}
        >
          <View style={S.sheet} onStartShouldSetResponder={() => true}>
            <View style={S.sheetHandle} />
            <Text style={S.sheetTitle}>Confirm payment</Text>
            <View style={S.summaryBox}>
              {[
                ['Network', network], 
                ['Bundle', bundle?.name || ''], 
                (bundle?.dataSize || bundle?.validity) ? ['Details', `${bundle?.dataSize || ''}${bundle?.dataSize && bundle?.validity ? ' · ' : ''}${bundle?.validity || ''}`] : null,
                ['Recipient', normalizePhone(recipientPhone)], 
                ['Amount', formatAmount(payTotal, currency)], 
                ['Pay via', pm ? methodLabel(pm) : paymentMethod], 
                paymentMethod === 'WALLET' ? null : ['Wallet', normalizePhone(paymentPhone)]
              ].filter((item): item is [string, string] => item !== null).map(([l, v]) => (
                <View key={l} style={S.sumRow}>
                  <Text style={S.sumLbl}>{l}</Text>
                  <Text style={S.sumVal}>{v}</Text>
                </View>
              ))}
            </View>
            <View style={S.modalBtns}>
              <TouchableOpacity style={S.btnOutline} onPress={() => setShowConfirm(false)}>
                <Text style={S.btnOutlineTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[S.btnGreen, loading && { opacity: 0.6 }]} 
                onPress={handlePay} 
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={S.btnTxt}>Pay {formatAmount(payTotal, currency)}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </GradientScreen>
  );
}

const S = themed(() => ({
  scroll: { flex: 1 }, 
  body: { padding: 20 },
  err: { backgroundColor: Colors.errorBg, borderRadius: 12, padding: 12, marginBottom: 16 },
  errTxt: { color: Colors.red, fontSize: 14, fontFamily: 'Nunito_400Regular' },
  lbl: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold', marginBottom: 8, marginTop: 18 },
  phoneRow: { flexDirection: 'row', borderWidth: 1.5, borderColor: Colors.border, borderRadius: 24, overflow: 'hidden', marginBottom: 6 },
  pfx: { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.primary, justifyContent: 'center' },
  pfxTxt: { color: '#fff', fontWeight: '700', fontSize: 14, fontFamily: 'Rubik_700Bold' },
  phoneIn: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary, fontFamily: 'Nunito_400Regular' },
  networkRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  networkBtn: { flex: 1, paddingVertical: 6, borderRadius: 24, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.cardBg, gap: 6 },
  networkLogo: { width: 34, height: 34 },
  networkBtnTxt: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold' },
  chipRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 4 },
  chip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  chipTxt: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold' },
  chipActiveTxt: { color: '#fff' },
  
  // Dropdown styles
  dropdownButton: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.cardBg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dropdownButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(6,163,218,0.04)',
  },
  dropdownButtonText: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontFamily: 'Nunito_400Regular',
    flex: 1,
  },
  dropdownButtonTextActive: {
    color: Colors.primary,
    fontWeight: '700',
    fontFamily: 'Rubik_700Bold',
  },
  dropdownArrow: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  dropdownArrowOpen: {
    transform: [{ rotate: '180deg' }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  dropdownModal: {
    position: 'absolute',
    left: 20,
    backgroundColor: Colors.cardBg,
    borderWidth: 1.5,
    borderColor: Colors.primary + '40',
    borderRadius: 12,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownOptionActive: {
    backgroundColor: 'rgba(6,163,218,0.08)',
  },
  dropdownOptionText: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontFamily: 'Nunito_400Regular',
  },
  dropdownOptionTextActive: {
    color: Colors.primary,
    fontWeight: '700',
    fontFamily: 'Rubik_700Bold',
  },
  dropdownOptionDetail: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: 'Nunito_400Regular',
    marginTop: 2,
  },
  dropdownOptionPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: 'Rubik_700Bold',
    marginLeft: 12,
  },
  dropdownOptionPriceActive: {
    color: Colors.primary,
  },
  
  btnPrimary: { backgroundColor: Colors.primary, borderRadius: 24, paddingVertical: 16, alignItems: 'center', marginTop: 28 },
  btnGreen: { flex: 2, backgroundColor: Colors.green, borderRadius: 24, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  btnOutline: { flex: 1, paddingVertical: 16, borderRadius: 24, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  btnOutlineTxt: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold' },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: 'bold', fontFamily: 'Rubik_700Bold' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 44 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold', marginBottom: 20 },
  summaryBox: { backgroundColor: Colors.subtleBg, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 20 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  sumLbl: { fontSize: 14, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular' },
  sumVal: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold', textAlign: 'right', flex: 1, marginLeft: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, marginTop: 4 },
  totalLbl: { fontSize: 16, fontWeight: 'bold', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold' },
  totalVal: { fontSize: 20, fontWeight: 'bold', color: Colors.primary, fontFamily: 'Rubik_700Bold' },
  modalBtns: { flexDirection: 'row', gap: 12 },
}));