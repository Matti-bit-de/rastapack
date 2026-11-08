# سایت رستا پک (rastapack.ir)

سایت استاتیک فارسی (RTL) با مولد Node.js. بدون فریم‌ورک؛ خروجی HTML/CSS/JS خالص.

## دستورها

```
npm install
npm run build        # نسخه‌ی نهایی در dist/  (با Sitemap و بدون noindex)
npm run release      # مثل build، ولی اگر صفحه‌ای reviewed: false باشد خطا می‌دهد. فقط با آن منتشر کنید
npm run build:temp   # نسخه‌ی موقت در dist-temp/  (همه‌ی صفحات noindex)
npm test             # ۱۰ تست خودکار روی dist/
npm run serve        # پیش‌نمایش محلی dist/ روی http://localhost:4173
```

## Vercel (نسخه‌ی موقت)

فایل `vercel.json` Vercel را روی `npm run build:temp` و پوشه‌ی `dist-temp` تنظیم می‌کند و هدر
`X-Robots-Tag: noindex` می‌گذارد. این نسخه را نباید گوگل ایندکس کند.

**انتشار نهایی:** از `npm run build` استفاده کنید و محتوای `dist/` را روی هاست اصلی آپلود کنید
(`dist/.htaccess` برای Apache/LiteSpeed ساخته می‌شود). `vercel.json` را برای سایت نهایی استفاده نکنید.

## ساختار

- `site.json`: اطلاعات تاییدشده‌ی شرکت (تماس، آدرس، ساعت کاری). فیلد خالی یعنی در سایت و Schema نمی‌آید.
- `content/`: صفحات و محتوا (Markdown + front matter). `draft: true` یعنی منتشر نمی‌شود.
- `redirects.json`: ریدایرکت‌های ۳۰۱.
- `images-src/`: تصاویر اصلی. نسخه‌های WebP/AVIF خودکار ساخته می‌شوند.
- `reviewed: false` در front matter یعنی متن هنوز توسط متخصص تایید نشده است.
