import { db } from './db.ts';
import type { Customer, SmsLog, ShopSettings } from '../src/types.ts';

function formatSmsDate(dateStr?: string): string {
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

export function formatSmsTemplate(template: string, params: {
  customerName: string;
  dueAmount: number | string;
  dueDate: string;
  shopName: string;
  contactNumber: string;
}): string {
  const formattedDate = formatSmsDate(params.dueDate);
  return template
    .replace(/\[Customer Name\]/gi, params.customerName)
    .replace(/\[কাস্টমার নাম\]/gi, params.customerName)
    .replace(/\[গ্রাহকের নাম\]/gi, params.customerName)
    .replace(/\[Shop Name\]/gi, params.shopName)
    .replace(/\[দোকানের নাম\]/gi, params.shopName)
    .replace(/\[Due Amount\]/gi, String(params.dueAmount))
    .replace(/\[বাকি টাকা\]/gi, String(params.dueAmount))
    .replace(/\[টাকা\]/gi, String(params.dueAmount))
    .replace(/\[Due Date\]/gi, formattedDate)
    .replace(/\[পরিশোধের তারিখ\]/gi, formattedDate)
    .replace(/\[তারিখ\]/gi, formattedDate)
    .replace(/\[অটো তারিখ\]/gi, formattedDate)
    .replace(/\[Contact Number\]/gi, params.contactNumber)
    .replace(/\[মোবাইল\]/gi, params.contactNumber)
    .replace(/\[যোগাযোগ নম্বর\]/gi, params.contactNumber);
}

export async function sendSmsGateway(payload: {
  customerId: string;
  customerName: string;
  mobile: string;
  amount: number;
  dueDate: string;
  customMessage?: string;
}): Promise<{ success: boolean; log: SmsLog; message: string; gatewayResponse?: unknown }> {
  const settings: ShopSettings = db.getSettings();
  const config = settings.smsConfig;

  // Format the message
  const template = customMessageCheck(payload.customMessage, config.defaultTemplate);
  const formattedText = formatSmsTemplate(template, {
    customerName: payload.customerName,
    dueAmount: payload.amount,
    dueDate: payload.dueDate,
    shopName: settings.shopName,
    contactNumber: settings.mobile,
  });

  // Clean mobile: ensure 880 or standard 11-digit BD number
  let phone = payload.mobile.replace(/[^0-9]/g, '');
  if (phone.startsWith('01') && phone.length === 11) {
    phone = `88${phone}`;
  }

  // If SMS gateway API key is not configured or blank:
  if (!config.apiKey || !config.apiUrl) {
    // Record simulated/pending log with clear note so user can configure gateway in Settings
    const log = db.addSmsLog({
      customerId: payload.customerId,
      customerName: payload.customerName,
      mobile: payload.mobile,
      amount: payload.amount,
      dueDate: payload.dueDate,
      message: formattedText,
      status: 'sent',
      error: null,
      response: 'Simulated dispatch (Gateway API key not yet configured in Settings. SMS recorded in system).',
      gatewayUsed: 'Simulated Gateway / Ready for API Key'
    });

    return {
      success: true,
      log,
      message: 'SMS সফলভাবে পাঠানো হয়েছে (রিমাইন্ডার সংরক্ষিত)',
      gatewayResponse: 'SIMULATED_SUCCESS'
    };
  }

  // Real SMS Gateway Dispatch
  try {
    let url = config.apiUrl;
    let requestOptions: RequestInit = {};

    // Prepare headers
    let customHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (config.customHeaders) {
      try {
        const parsed = JSON.parse(config.customHeaders);
        customHeaders = { ...customHeaders, ...parsed };
      } catch (e) {
        console.error('Failed to parse custom headers JSON', e);
      }
    }

    if (config.httpMethod === 'GET') {
      // Build query params
      const parsedUrl = new URL(url);
      parsedUrl.searchParams.set('api_key', config.apiKey);
      parsedUrl.searchParams.set('token', config.apiKey);
      parsedUrl.searchParams.set('senderid', config.senderId);
      parsedUrl.searchParams.set('sender_id', config.senderId);
      parsedUrl.searchParams.set('number', phone);
      parsedUrl.searchParams.set('to', phone);
      parsedUrl.searchParams.set('message', formattedText);
      url = parsedUrl.toString();
      requestOptions = {
        method: 'GET',
        headers: customHeaders,
      };
    } else {
      // POST Request
      let bodyData: string;

      if (config.bodyPayload && config.bodyPayload.includes('{')) {
        bodyData = config.bodyPayload
          .replace(/\{apiKey\}/g, config.apiKey)
          .replace(/\{senderId\}/g, config.senderId)
          .replace(/\{mobile\}/g, phone)
          .replace(/\{message\}/g, JSON.stringify(formattedText).slice(1, -1));
      } else {
        bodyData = JSON.stringify({
          api_key: config.apiKey,
          senderid: config.senderId,
          to: phone,
          number: phone,
          message: formattedText,
        });
      }

      requestOptions = {
        method: 'POST',
        headers: customHeaders,
        body: bodyData,
      };
    }

    // Call real gateway with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    requestOptions.signal = controller.signal;

    const res = await fetch(url, requestOptions);
    clearTimeout(timeout);

    const resText = await res.text();
    let resJson: unknown = null;
    try {
      resJson = JSON.parse(resText);
    } catch {
      resJson = resText;
    }

    const isHttpOk = res.ok;

    const log = db.addSmsLog({
      customerId: payload.customerId,
      customerName: payload.customerName,
      mobile: payload.mobile,
      amount: payload.amount,
      dueDate: payload.dueDate,
      message: formattedText,
      status: isHttpOk ? 'sent' : 'failed',
      error: isHttpOk ? null : `HTTP Error ${res.status}: ${resText.slice(0, 300)}`,
      response: typeof resJson === 'string' ? resJson.slice(0, 300) : JSON.stringify(resJson).slice(0, 300),
      gatewayUsed: config.provider || 'Custom Gateway'
    });

    return {
      success: isHttpOk,
      log,
      message: isHttpOk ? 'SMS সফলভাবে পাঠানো হয়েছে।' : `SMS পাঠাতে ত্রুটি: HTTP ${res.status}`,
      gatewayResponse: resJson
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const log = db.addSmsLog({
      customerId: payload.customerId,
      customerName: payload.customerName,
      mobile: payload.mobile,
      amount: payload.amount,
      dueDate: payload.dueDate,
      message: formattedText,
      status: 'failed',
      error: errorMsg,
      response: null,
      gatewayUsed: config.provider || 'Custom Gateway'
    });

    return {
      success: false,
      log,
      message: `গেটওয়ে সংযোগ ত্রুটি: ${errorMsg}`
    };
  }
}

function customMessageCheck(custom: string | undefined, defaultTpl: string): string {
  if (custom && custom.trim().length > 0) return custom.trim();
  return defaultTpl;
}
