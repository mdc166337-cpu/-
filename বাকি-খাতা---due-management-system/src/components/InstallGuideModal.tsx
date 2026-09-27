import React from 'react';
import { X, Monitor, Download, ExternalLink, CheckCircle2, Laptop, ArrowRight, Sparkles, Terminal } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

interface InstallGuideModalProps {
  onClose: () => void;
}

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({ onClose }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  const handleInstallClick = async () => {
    if (isInstallable) {
      const res = await install();
      if (res) {
        onClose();
      }
    } else {
      // If inside iframe, open in full browser tab where Chrome/Edge allows install
      window.open(window.location.origin, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                কম্পিউটার বা ল্যাপটপে অ্যাপ ইন্সটল
              </h3>
              <p className="text-xs text-slate-500">
                ডেস্কটপে সফটওয়্যার হিসেবে চালিয়ে দ্রুত হিসাব রাখুন
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 py-4 space-y-5 text-slate-700 text-xs sm:text-sm">
          {/* Status Banner */}
          {isInstalled ? (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <strong className="block font-bold">অ্যাপটি আপনার ডিভাইসে অলরেডি ইন্সটল করা আছে!</strong>
                <span className="text-xs text-emerald-700">ডেস্কটপ শর্টকাট বা স্টার্ট মেনু থেকে সরাসরি ওপেন করতে পারেন।</span>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-emerald-600 text-white rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
              <div className="space-y-0.5 text-center sm:text-left">
                <span className="font-extrabold text-sm sm:text-base flex items-center justify-center sm:justify-start gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  ডেস্কটপ অ্যাপ (PWA) ইন্সটল
                </span>
                <p className="text-xs text-emerald-100">
                  ক্রোম বা এজ ব্রাউজারের মাধ্যমে সরাসরি PC-তে সফটওয়্যার তৈরি হবে
                </p>
              </div>
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full sm:w-auto px-4 py-2 bg-white text-emerald-800 hover:bg-emerald-50 font-bold rounded-xl text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>{isInstallable ? 'এখনই ইন্সটল করুন' : 'নতুন ট্যাবে খুলে ইন্সটল করুন'}</span>
              </button>
            </div>
          )}

          {/* Method 1: Chrome / Edge Install Steps */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm sm:text-base">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black">
                ১
              </span>
              <span>গুগল ক্রোম (Chrome) বা এজ (Edge) দিয়ে ১-ক্লিকে ইন্সটল (সবচেয়ে সহজ)</span>
            </div>

            <ol className="space-y-2.5 text-xs text-slate-600 list-decimal list-inside pl-1">
              <li className="leading-relaxed">
                আপনার ব্রাউজারে লিংকটি খুলুন (অথবা উপরের <strong className="text-slate-800">"নতুন ট্যাবে খুলে ইন্সটল করুন"</strong> বাটনে চাপুন)।
              </li>
              <li className="leading-relaxed">
                গুগল ক্রোম ব্রাউজারের উপরের অ্যাড্রেস বারের (URL bar) একেবারে ডানপাশে একটি ছোট 
                <strong className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded ml-1 border border-emerald-200">
                  কম্পিউটার/ডাউনলোড আইকন 💻 (Install বাকি খাতা)
                </strong> দেখতে পাবেন।
              </li>
              <li className="leading-relaxed">
                যদি আইকনটি না দেখতে পান, তবে ব্রাউজারের ডানপাশের <strong>৩টি ডট (Three Dots ⋮)</strong> মেনুতে ক্লিক করে 
                <strong className="text-slate-800"> "Save and share" → "Install বাকি খাতা as app..."</strong> এ ক্লিক করুন।
              </li>
              <li className="leading-relaxed">
                এবার <strong>"Install"</strong> বাটনে ক্লিক করলেই আপনার কম্পিউটারের <strong>Desktop</strong> ও <strong>Start Menu</strong>-তে অ্যাপ আইকন তৈরি হয়ে যাবে এবং ব্রাউজারের কোনো বার ছাড়াই স্বতন্ত্র সফটওয়্যার উইন্ডো হিসেবে ওপেন হবে।
              </li>
            </ol>
          </div>

          {/* Method 2: Offline Local Node.js Setup */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-black">
                ২
              </span>
              <span>পিসিতে সম্পূর্ণ অফলাইন লোকাল সফটওয়্যার হিসেবে সেটআপ (Node.js দিয়ে)</span>
            </div>

            <p className="text-xs text-slate-600">
              আপনি যদি ইন্টারনেট ছাড়াই নিজের পিসিতে স্থায়ীভাবে ডাটাবেজ সহ সফটওয়্যারটি আজীবন চালাতে চান:
            </p>

            <div className="bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-[11px] sm:text-xs space-y-1.5 overflow-x-auto">
              <div className="text-slate-400 font-sans text-[10px]"># ১. AI Studio-এর উপরের মেনু থেকে "Export to ZIP" করে জিপ ফাইল আনজিপ করুন</div>
              <div className="text-slate-400 font-sans text-[10px]"># ২. ফোল্ডারে টার্মিনাল বা CMD খুলে নিচের কমান্ডগুলো দিন:</div>
              <div>npm install</div>
              <div>npm run build</div>
              <div>npm start</div>
              <div className="text-slate-400 font-sans text-[10px] pt-1"># ব্রাউজারে প্রবেশ করুন: http://localhost:3000</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            অনলাইন সেবা কেন্দ্র • বাকি খাতা সিস্টেম
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            বুঝেছি / বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
