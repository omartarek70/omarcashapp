ملف التعليمات لصنع مثبت (Setup.exe) للتطبيق

الخيار A — أبسط: استخدم electron-builder (مفضّل لو مثبت):
1) افتح PowerShell كمسؤول (Run as Administrator).
2) شغّل الأوامر:

   cd "D:\omar\Omar tarek AUC\omar tarekqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq - Copy\cash-app"
   npm install
   npm run electron-build

3) إن نجح: ستجد المثبّت في `dist/electron`.

ملاحظة: على بعض الأجهزة electron-builder يحاول تنزيل أدوات التوقيع ويحتاج صلاحيات. إن ظهر خطأ متعلقًا بفك أرشيف winCodeSign، استخدم الخيار B أدناه.


الخيار B — بناء NSIS محلي (بدون توقيع) بواسطة NSIS:
- خطوة 1: ثبت NSIS من https://nsis.sourceforge.io/Download
- خطوة 2: تأكد أن `makensis.exe` موجود في PATH (أعد فتح PowerShell بعد التثبيت).
- خطوة 3: في مجلد المشروع شغّل PowerShell كمسؤول (مطلوب إذا تريد تثبيت إلى Program Files أثناء الاختبار)، أو عادي لو تود اختبار وتثبيت في مكان آخر.
- خطوة 4: نفّذ:

   cd "<مسار المشروع>"
   build-installer.bat

- الناتج: `dist_electron_packager\CashApp-Setup.exe`.


الخيار C — إذا لم تريد تثبيت:
- استخدم الملف المحمول ZIP الموجود: `dist_electron_packager\CashApp-portable.zip` — فكّ الضغط وشغّل `Cash App.exe`.

إذا تريد، أستطيع:
- أرفع الـ ZIP لمكان تنزيل (احتاج إذن أو إعداد رفع)، أو
- أجرّب إعادة تشغيل `electron-builder` هنا لكن سيحتاج صلاحيات Administrator على هذه الجلسة (أنت من يمنحها)، أو
- أعدّل إعدادات البناء لتجنّب تنزيل winCodeSign (لكن قد يبقى سلوك خارجي).

أي خيار تريد أعمله الآن؟