// Bengali currency and date formatting helpers

export function formatCurrency(amount: number | string | undefined, symbol = '৳'): string {
  const num = Number(amount) || 0;
  return `${symbol} ${num.toLocaleString('en-IN')}`;
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('bn-BD', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export function formatDateEn(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export function getDaysDifference(dateStr?: string): number {
  if (!dateStr) return 0;
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getWhatsAppLink(mobile: string, text: string): string {
  let cleanMobile = mobile.replace(/[^0-9]/g, '');
  if (cleanMobile.startsWith('01') && cleanMobile.length === 11) {
    cleanMobile = `88${cleanMobile}`;
  }
  return `https://wa.me/${cleanMobile}?text=${encodeURIComponent(text)}`;
}

export function getNativeSmsLink(mobile: string, text: string): string {
  let cleanMobile = mobile.replace(/[^0-9]/g, '');
  // For phone SIM SMS app in Bangladesh, 017XXXXXXXX or 88017XXXXXXXX works. Keep standard 11 digits or local format
  if (cleanMobile.startsWith('880') && cleanMobile.length === 13) {
    cleanMobile = cleanMobile.substring(2);
  }
  return `sms:${cleanMobile}?body=${encodeURIComponent(text)}`;
}

export const POPULAR_PRODUCTS = [
  { name: 'ফটোকপি (A4 এক পিঠ)', unit: 'পাতা', defaultPrice: 3 },
  { name: 'ফটোকপি (A4 দুই পিঠ)', unit: 'পাতা', defaultPrice: 5 },
  { name: 'ফটোকপি (লিগ্যাল সাইজ)', unit: 'পাতা', defaultPrice: 5 },
  { name: 'কম্পিউটার প্রিন্ট (সাদা-কালো)', unit: 'পাতা', defaultPrice: 5 },
  { name: 'কালার প্রিন্ট (সাধারণ পেপার)', unit: 'পাতা', defaultPrice: 10 },
  { name: 'কালার প্রিন্ট (গ্লসি ফটো পেপার)', unit: 'পাতা', defaultPrice: 20 },
  { name: 'পাসপোর্ট সাইজ ছবি (৪ কপি)', unit: 'সেট', defaultPrice: 50 },
  { name: 'পাসপোর্ট সাইজ ছবি (৮ কপি)', unit: 'সেট', defaultPrice: 80 },
  { name: 'অনলাইন চাকরির আবেদন', unit: 'টি', defaultPrice: 150 },
  { name: 'অনলাইন ভর্তি আবেদন', unit: 'টি', defaultPrice: 100 },
  { name: 'ভোটার আইডি (NID) ডাউনলোড ও প্রিন্ট', unit: 'টি', defaultPrice: 50 },
  { name: 'ভোটার আইডি (NID) সংশোধন আবেদন', unit: 'টি', defaultPrice: 200 },
  { name: 'জন্ম নিবন্ধন অনলাইন আবেদন', unit: 'টি', defaultPrice: 100 },
  { name: 'জন্ম নিবন্ধন অনলাইন কপি উত্তোলন', unit: 'টি', defaultPrice: 50 },
  { name: 'লেমিনেশন (A4 সাইজ)', unit: 'পিস', defaultPrice: 30 },
  { name: 'লেমিনেশন (আইডি কার্ড / ড্রাইভিং)', unit: 'পিস', defaultPrice: 20 },
  { name: 'কম্পোজ / টাইপিং (বাংলা/ইংরেজি)', unit: 'পাতা', defaultPrice: 30 },
  { name: 'ডকুমেন্ট স্ক্যান ও ইমেইল প্রেরণ', unit: 'ফাইল', defaultPrice: 20 },
  { name: 'বিদ্যুৎ বিল / পল্লী বিদ্যুৎ বিল পেমেন্ট', unit: 'টি', defaultPrice: 10 },
  { name: 'পরীক্ষার প্রবেশপত্র (Admit Card) প্রিন্ট', unit: 'টি', defaultPrice: 20 },
  { name: 'পাসপোর্ট অনলাইন আবেদন', unit: 'টি', defaultPrice: 300 },
  { name: 'স্ট্যাম্প / এফিডেভিট পেপার', unit: 'সেট', defaultPrice: 150 },
  { name: 'খাতা / কলম / ফাইল ফোল্ডার', unit: 'পিস', defaultPrice: 25 },
];

export const PRODUCT_UNITS = [
  'পাতা',
  'কপি',
  'পিস',
  'সেট',
  'টি',
  'ফাইল',
  'জন',
  'প্যাকেট',
  'অন্যান্য'
];

export function formatSmsTemplate(
  template: string,
  params: {
    customerName?: string;
    dueAmount?: number | string;
    dueDate?: string;
    shopName?: string;
    contactNumber?: string;
  }
): string {
  if (!template) return '';
  const dateFormatted = params.dueDate ? formatDate(params.dueDate) : '';
  return template
    .replace(/\[Customer Name\]/gi, params.customerName || '')
    .replace(/\[কাস্টমার নাম\]/gi, params.customerName || '')
    .replace(/\[গ্রাহকের নাম\]/gi, params.customerName || '')
    .replace(/\[Shop Name\]/gi, params.shopName || '')
    .replace(/\[দোকানের নাম\]/gi, params.shopName || '')
    .replace(/\[Due Amount\]/gi, String(params.dueAmount || 0))
    .replace(/\[বাকি টাকা\]/gi, String(params.dueAmount || 0))
    .replace(/\[টাকা\]/gi, String(params.dueAmount || 0))
    .replace(/\[Due Date\]/gi, dateFormatted)
    .replace(/\[পরিশোধের তারিখ\]/gi, dateFormatted)
    .replace(/\[তারিখ\]/gi, dateFormatted)
    .replace(/\[অটো তারিখ\]/gi, dateFormatted)
    .replace(/\[Contact Number\]/gi, params.contactNumber || '')
    .replace(/\[মোবাইল\]/gi, params.contactNumber || '')
    .replace(/\[যোগাযোগ নম্বর\]/gi, params.contactNumber || '');
}

const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
export function toBengaliNumber(num: number | string | undefined): string {
  if (num === undefined || num === null) return '';
  return String(num).replace(/[0-9]/g, (d) => bnDigits[parseInt(d, 10)]);
}

const bOnes = [
  '', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়', 'দশ',
  'এগারো', 'বারো', 'তেরো', 'চৌদ্দ', 'পনেরো', 'ষোলো', 'সতেরো', 'আঠারো', 'উনিশ', 'বিশ',
  'একুশ', 'বাইশ', 'তেইশ', 'চব্বিশ', 'পঁচিশ', 'ছাব্বিশ', 'সাতাশ', 'আটাশ', 'ঊনত্রিশ', 'ত্রিশ',
  'একত্রিশ', 'বত্রিশ', 'তেত্রিশ', 'চৌত্রিশ', 'পঁয়ত্রিশ', 'ছত্রিশ', 'সাঁইত্রিশ', 'আটত্রিশ', 'ঊনচল্লিশ', 'চল্লিশ',
  'একচল্লিশ', 'বিয়াল্লিশ', 'তেতাল্লিশ', 'চুয়াল্লিশ', 'পঁয়তাল্লিশ', 'ছেচল্লিশ', 'সাতচল্লিশ', 'আটচল্লিশ', 'ঊনপঞ্চাশ', 'পঞ্চাশ',
  'একান্ন', 'বায়ান্ন', 'তিপ্পান্ন', 'চুয়ান্ন', 'পঞ্চান্ন', 'ছাপ্পান্ন', 'সাতান্ন', 'আটান্ন', 'ঊনষাট', 'ষাট',
  'একষট্টি', 'বাষট্টি', 'তেষট্টি', 'চৌষট্টি', 'পঁয়ষট্টি', 'ছেষট্টি', 'সাতষট্টি', 'আটষট্টি', 'ঊনসত্তর', 'সত্তর',
  'একাত্তর', 'বাহাত্তর', 'তিয়াত্তর', 'চুয়াত্তর', 'পঁচাত্তর', 'ছিয়াত্তর', 'সাতাত্তর', 'আটাত্তর', 'ঊনআশি', 'আশি',
  'একাশি', 'বিরাশি', 'তিরাশি', 'চুরাশি', 'পঁচাশী', 'ছিয়াশি', 'সাতাশি', 'আটাশি', 'ঊননব্বই', 'নব্বই',
  'একানব্বই', 'বিরানব্বই', 'তিরানব্বই', 'চুরানব্বই', 'পঁচানব্বই', 'ছিয়ানব্বই', 'সাতানব্বই', 'আটানব্বই', 'নিরানব্বই'
];

export function numberToBengaliWords(n: number | string | undefined): string {
  const amount = Math.floor(Math.abs(Number(n) || 0));
  if (amount === 0) return 'শূন্য টাকা মাত্র';

  let num = amount;
  let words = '';

  const crore = Math.floor(num / 10000000);
  num %= 10000000;

  const lakh = Math.floor(num / 100000);
  num %= 100000;

  const thousand = Math.floor(num / 1000);
  num %= 1000;

  const hundred = Math.floor(num / 100);
  num %= 100;

  if (crore > 0) {
    words += `${numberToBengaliWords(crore).replace(' টাকা মাত্র', '')} কোটি `;
  }
  if (lakh > 0) {
    words += `${bOnes[lakh] || lakh} লাখ `;
  }
  if (thousand > 0) {
    words += `${bOnes[thousand] || thousand} হাজার `;
  }
  if (hundred > 0) {
    words += `${bOnes[hundred] || hundred} শত `;
  }
  if (num > 0) {
    words += `${bOnes[num] || num} `;
  }

  return `${words.trim()} টাকা মাত্র`;
}
