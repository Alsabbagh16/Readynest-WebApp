import { addMonths } from 'date-fns';

export const EQUIPMENT_PLACEHOLDER_IMAGE = '/images/equipment-placeholder.jpg';

const parseLocalDate = (value) => {
  if (!value) return null;
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

export const getWarrantyDetails = (datePurchased, warrantyMonths, today = new Date()) => {
  const purchaseDate = parseLocalDate(datePurchased);
  const months = warrantyMonths === '' || warrantyMonths === null || warrantyMonths === undefined
    ? null
    : Number(warrantyMonths);

  if (!purchaseDate || !Number.isInteger(months) || months < 0) {
    return { status: 'Unknown', expiryDate: null };
  }

  const expiryDate = addMonths(purchaseDate, months);
  const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return {
    status: localToday <= expiryDate ? 'Active' : 'Expired',
    expiryDate: `${expiryDate.getFullYear()}-${String(expiryDate.getMonth() + 1).padStart(2, '0')}-${String(expiryDate.getDate()).padStart(2, '0')}`,
  };
};

export const getWarrantyBadgeClass = (status) => {
  if (status === 'Active') return 'border-green-200 bg-green-50 text-green-700';
  if (status === 'Expired') return 'border-red-200 bg-red-50 text-red-700';
  return 'border-slate-200 bg-slate-50 text-slate-600';
};
