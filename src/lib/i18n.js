const STRINGS = {
  ar: {
    title: 'ورقي',
    searchPlaceholder: 'ابحث في مستنداتك…',
    langBoth: 'عربي + إنجليزي',
    langAra: 'عربي فقط',
    langEng: 'إنجليزي فقط',
    import: 'استيراد',
    exportArchive: 'تصدير الأرشيف',
    cancel: 'إلغاء',
    empty: 'لا توجد مستندات بعد. اسحب صورة إلى النافذة أو اضغط استيراد.',
    untyped: 'بدون تصنيف',
    close: 'إغلاق',
    delete: 'حذف',
    exportPdf: 'تصدير PDF',
    addTag: 'أضف وسمًا…',
    add: 'إضافة',
    extracted: 'النص المستخرج',
    noText: '(لا يوجد نص)',
    confirmDelete: 'حذف هذا المستند؟',
    saved: 'تم الحفظ',
    duplicate: 'هذا المستند موجود مسبقًا',
    exported: (n) => `تم تصدير ${n} مستند`,
    failed: (n, t) => `فشل ${n} من ${t}`,
    reading: 'قراءة الصورة',
    starting: 'بدء',
  },
  en: {
    title: 'Waraqi',
    searchPlaceholder: 'Search your documents…',
    langBoth: 'Arabic + English',
    langAra: 'Arabic only',
    langEng: 'English only',
    import: 'Import',
    exportArchive: 'Export archive',
    cancel: 'Cancel',
    empty: 'No documents yet. Drop an image on the window or press Import.',
    untyped: 'Untyped',
    close: 'Close',
    delete: 'Delete',
    exportPdf: 'Export PDF',
    addTag: 'Add a tag…',
    add: 'Add',
    extracted: 'Extracted text',
    noText: '(no text)',
    confirmDelete: 'Delete this document?',
    saved: 'Saved',
    duplicate: 'This document is already in the library',
    exported: (n) => `Exported ${n} documents`,
    failed: (n, t) => `${n} of ${t} failed`,
    reading: 'Reading image',
    starting: 'Starting',
  },
};

let current = localStorage.getItem('waraqi.ui') === 'en' ? 'en' : 'ar';

export function lang() {
  return current;
}

export function t(key, ...args) {
  const v = STRINGS[current][key];
  return typeof v === 'function' ? v(...args) : (v ?? key);
}

export function applyLang() {
  const html = document.documentElement;
  html.lang = current === 'ar' ? 'ar' : 'en';
  html.dir = current === 'ar' ? 'rtl' : 'ltr';

  document.querySelector('h1').textContent = t('title');
  document.querySelector('#ui-lang').textContent = current === 'ar' ? 'EN' : 'ع';

  for (const el of document.querySelectorAll('[data-i18n]')) {
    el.textContent = t(el.dataset.i18n);
  }
  for (const el of document.querySelectorAll('[data-i18n-ph]')) {
    el.placeholder = t(el.dataset.i18nPh);
  }
}

export function toggleLang() {
  current = current === 'ar' ? 'en' : 'ar';
  localStorage.setItem('waraqi.ui', current);
  applyLang();
}
