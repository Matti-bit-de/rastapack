import { esc } from '../lib/util.js';
import { metaTags, ldScript } from '../lib/seo.js';

const telHref = (t) => `tel:${t}`;

export function header(ctx, page) {
  const { site, images, navItems } = ctx;
  const mark = images.picture('logo-mark.png', '', { eager: true, sizes: '48px', decorative: true, className: 'brand__mark' });
  const links = navItems
    .map((n) => {
      const current = page.url === n.url || (n.url !== '/' && page.url.startsWith(n.url));
      return `<li><a href="${esc(n.url)}"${current ? ' aria-current="page"' : ''}>${esc(n.label)}</a></li>`;
    })
    .join('');
  return `<header class="site-header">
  <div class="wrap site-header__row">
    <a class="brand" href="/">
      ${mark}
      <span class="brand__text"><strong>${esc(site.name)}</strong><span>${esc(site.legalDescriptor)}</span></span>
    </a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">منو</button>
    <nav class="site-nav" id="site-nav" aria-label="منوی اصلی"><ul>${links}</ul></nav>
    <a class="btn btn--small site-header__call" href="${telHref(site.mobile.tel)}">تماس: <span dir="ltr">${esc(site.mobile.display)}</span></a>
  </div>
</header>`;
}

export function footer(ctx) {
  const { site, collections } = ctx;
  const list = (items) => items.map((i) => `<li><a href="${esc(i.url)}">${esc(i.data.title)}</a></li>`).join('');
  const year = new Date().toLocaleDateString('fa-IR', { year: 'numeric', timeZone: 'Asia/Tehran' });
  const socials = Object.entries(site.social || {})
    .filter(([, v]) => v)
    .map(([k, v]) => `<li><a href="${esc(v)}" rel="noopener me">${esc(k)}</a></li>`)
    .join('');
  return `<footer class="site-footer">
  <div class="wrap site-footer__grid">
    <div>
      <p class="site-footer__name">${esc(site.name)}</p>
      <p>${esc(site.legalDescriptor)}</p>
      <address>
        <p>${esc(site.address.display)}</p>
        <p>تلفن: <a href="${telHref(site.phone.tel)}" dir="ltr">${esc(site.phone.display)}</a></p>
        <p>موبایل و واتساپ: <a href="${telHref(site.mobile.tel)}" dir="ltr">${esc(site.mobile.display)}</a></p>
        ${site.email ? `<p>ایمیل: <a href="mailto:${esc(site.email)}">${esc(site.email)}</a></p>` : ''}
        <p>${esc(site.hours.display)}</p>
      </address>
    </div>
    <nav aria-label="خدمات">
      <p class="site-footer__title">خدمات</p>
      <ul>${list(collections.services)}</ul>
    </nav>
    <nav aria-label="صنایع">
      <p class="site-footer__title">صنایع</p>
      <ul>${list(collections.industries)}</ul>
    </nav>
    ${socials ? `<nav aria-label="شبکه‌های اجتماعی"><p class="site-footer__title">ما را دنبال کنید</p><ul>${socials}</ul></nav>` : ''}
  </div>
  <div class="wrap site-footer__legal"><p>© ${year} ${esc(site.name)}. همه‌ی حقوق محفوظ است.</p></div>
</footer>
<div class="callbar" role="group" aria-label="راه‌های تماس سریع">
  <a class="callbar__a" href="${telHref(site.mobile.tel)}">تماس تلفنی</a>
  <a class="callbar__a callbar__a--alt" href="https://wa.me/${esc(site.mobile.whatsapp)}" rel="noopener">واتساپ</a>
</div>`;
}

export function breadcrumbNav(trail) {
  if (trail.length < 2) return '';
  const items = trail
    .map((c, i) =>
      i === trail.length - 1
        ? `<li aria-current="page">${esc(c.label)}</li>`
        : `<li><a href="${esc(c.url)}">${esc(c.label)}</a></li>`,
    )
    .join('');
  return `<nav class="crumbs" aria-label="مسیر صفحه"><ol>${items}</ol></nav>`;
}

export function ctaBlock(ctx, { title = 'برای مشاوره تماس بگیرید', text } = {}) {
  const { site } = ctx;
  return `<section class="cta" aria-labelledby="cta-title">
  <div class="wrap cta__row">
    <div>
      <h2 id="cta-title">${esc(title)}</h2>
      <p>${esc(text || 'ابعاد و نوع محصول، تعداد مورد نیاز و تصویر کلی از بسته‌ی مدنظرتان را بگویید تا بهترین مسیر کار را با هم مشخص کنیم. ' + site.hours.display + '.')}</p>
    </div>
    <div class="cta__actions">
      <a class="btn" href="${telHref(site.mobile.tel)}">تماس با <span dir="ltr">${esc(site.mobile.display)}</span></a>
      <a class="btn btn--ghost" href="https://wa.me/${esc(site.mobile.whatsapp)}" rel="noopener">پیام در واتساپ</a>
    </div>
  </div>
</section>`;
}

export function document({ ctx, page, main, schemas = [], seoTitle, bodyClass = '' }) {
  const { site, assets } = ctx;
  const ogImage = page.ogImage || ctx.defaultOg;
  const ga = site.analytics?.ga4
    ? `\n<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(site.analytics.ga4)}"></script>\n<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${esc(site.analytics.ga4)}');</script>`
    : '';
  return `<!doctype html>
<html lang="fa" dir="rtl" class="no-js">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${metaTags({ site, page, seoTitle, ogImage })}
  <meta name="theme-color" content="${esc(site.brand.navy)}">
  <link rel="icon" href="/favicon.ico" sizes="32x32">
  <link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="preload" href="${assets.font}" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${assets.css}">
  <script>document.documentElement.className='js'</script>
  ${schemas.map(ldScript).join('\n  ')}${ga}
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ''}>
  <a class="skip" href="#main">رفتن به محتوای اصلی</a>
  ${header(ctx, page)}
  <main id="main">
${main}
  </main>
  ${footer(ctx)}
  <script src="${assets.js}" defer></script>
</body>
</html>
`;
}
