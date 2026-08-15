import { Ionicons } from '@expo/vector-icons';
import { productsApi, BASE_URL } from './api';

// Single source of truth for biller display metadata, shared by the Bills
// screen and the Beneficiaries screen. Previously each screen had its own
// copy of this mapping (and Bills even had its own separate hardcoded biller
// list entirely) — they drifted, which is exactly how DSTV ended up on the
// website's biller list but missing from the app's. Fetching from the same
// place, with only one copy of this mapping, is what actually prevents that.

export const getBillerColor = (code: string): string => ({
  ZESA: '#f59e0b', DSTV: '#1d4ed8', GOTV: '#2563eb', TELONE: '#059669', ZINWA: '#0284c7',
  CITY: '#7c3aed', NYARADZO: '#831843', SCHOOL: '#b45309', MUKURU: '#c2410c', FURNITURE: '#92400e',
  BULAWAYO: '#7c3aed', ZOL: '#0284c7', MOONLIGHT: '#4c1d95',
}[code] || '#06A3DA');

export const getFieldName = (code: string): string => ({
  ZESA: 'Meter Number', DSTV: 'Smartcard Number', GOTV: 'Smartcard Number', TELONE: 'Account Number',
  ZINWA: 'Account Number', CITY: 'Account Number', NYARADZO: 'Policy Number', SCHOOL: 'Student ID',
  MUKURU: 'Policy Number', FURNITURE: 'Account Number', BULAWAYO: 'Account Number', ZOL: 'Account Number',
  MOONLIGHT: 'Policy Number',
}[code] || 'Account Number');

export const getFallbackIcon = (code: string): keyof typeof Ionicons.glyphMap => ({
  ZESA: 'flash-outline', DSTV: 'tv-outline', GOTV: 'tv-outline', TELONE: 'call-outline',
  ZINWA: 'water-outline', CITY: 'business-outline', NYARADZO: 'shield-checkmark-outline',
  SCHOOL: 'school-outline', MUKURU: 'cart-outline', FURNITURE: 'bed-outline',
  BULAWAYO: 'business-outline', ZOL: 'wifi-outline', MOONLIGHT: 'moon-outline',
} as any)[code] || 'receipt-outline';

export const getMerchantCode = (productCode: string): string => ({
  ZESA_TOKEN: 'ZESA', DSTV_RENEWAL: 'DSTV', GOTV_RENEWAL: 'GOTV', TELONE_BILL: 'TELONE',
  BULAWAYO_BILL: 'BULAWAYO', ZOL_PAYMENT: 'ZOL', NYARADZO_PAYMENT: 'NYARADZO', MOONLIGHT_PAYMENT: 'MOONLIGHT',
}[productCode] || productCode.replace('BILLS_', ''));

export interface Biller {
  code: string;
  name: string;
  color: string;
  fullLogoUrl: string | null;
  field: string;
  productCode: string;
}

// Fetches whatever is actually active in the admin portal right now —
// never a fixed list baked into the app.
export async function fetchActiveBillers(): Promise<Biller[]> {
  const r = await productsApi.getAll();
  const all = r.data?.data || r.data || [];
  return all
    .filter((p: any) => p.category === 'BILLS' && p.isActive === true)
    .map((p: any) => {
      const merchantCode = getMerchantCode(p.code);
      return {
        code: merchantCode,
        name: p.name,
        color: getBillerColor(merchantCode),
        fullLogoUrl: p.logoUrl ? `${BASE_URL}${p.logoUrl}` : null,
        field: getFieldName(merchantCode),
        productCode: p.code,
      };
    });
}
