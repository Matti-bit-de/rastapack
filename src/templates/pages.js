import { esc, faDate } from '../lib/util.js';
import { organizationSchema, websiteSchema, breadcrumbSchema, articleSchema } from '../lib/seo.js';
import { dieline, dielineLegend } from './dieline.js';
import { breadcrumbNav, ctaBlock, document } from './layout.js';

const telHref = (t) => `tel:${t}`;

function toc(page) {
  const h2 = page.headings.filter((h) => h.depth === 2);
  if (h2.length < 4) return '';
  return `<nav class="toc" aria-label="فهرست این صفحه"><p class="toc__title">در این صفحه</p><ol>${h2
    .map((h) => `<li><a href="#${esc(h.id)}">${esc(h.text)}</a></li>`)
    .join('')}</ol></nav>`;
}

function related(ctx, page) {
  const urls = page.data.related;
  if (!Array.isArray(urls) || !urls.length) return '';
  const items = urls
    .map((u) => ctx.byUrl.get(u))
    .filter(Boolean)
    .map((p) => `<li><a href="${esc(p.url)}"><strong>${esc(p.data.title)}</strong>${p.data.summary ? `<span>${esc(p.data.summary)}</span>` : ''}</a></li>`)
    .join('');
  if (!items) return '';
  return `<section class="related" aria-labelledby="related-title"><div class="wrap wrap--narrow"><h2 id="related-title">مطالب مرتبط</h2><ul class="related__list">${items}</ul></div></section>`;
}

function listRows(items, { withNumbers = false } = {}) {
  return `<ul class="rows">${items
    .map(
      (p) => `<li class="row">
      <h3 class="row__title"><a href="${esc(p.url)}">${esc(p.data.title)}</a></h3>
      <p class="row__text">${esc(p.data.summary)}</p>
    </li>`,
    )
    .join('')}</ul>`;
}

const pageHead = (title, lead, trail) => `<section class="page-head">
  <div class="wrap wrap--narrow">
    ${breadcrumbNav(trail)}
    <h1>${esc(title)}</h1>
    ${lead ? `<p class="lead">${esc(lead)}</p>` : ''}
  </div>
</section>`;

/* ------------------------------------------------------------ home */
function home(ctx, page) {
  const { site, collections } = ctx;
  const services = collections.services;
  const industries = collections.industries;

  const steps = [
    ['گفت‌وگو و دریافت اطلاعات محصول', 'ابعاد محصول، جنس، تعداد، روش چاپ و محل مصرف بسته را بررسی می‌کنیم.'],
    ['طراحی ساختاری و نمونه', 'فرم جعبه و دایلاین را می‌کشیم و در صورت نیاز نمونه‌ی سفید یا موکاپ می‌سازیم.'],
    ['طراحی گرافیکی', 'رنگ، تایپوگرافی و چیدمان اطلاعات را روی پنل‌های واقعی جعبه طراحی می‌کنیم.'],
    ['آماده‌سازی فایل چاپ', 'مد رنگی، Bleed و خط برش را مطابق نیاز چاپخانه تنظیم و فایل نهایی را تحویل می‌دهیم.'],
  ];

  const main = `
<section class="hero">
  <div class="wrap hero__grid">
    <div class="hero__text">
      <h1>${esc(page.data.h1)}</h1>
      <p class="lead">${esc(page.data.lead)}</p>
      <div class="hero__actions">
        <a class="btn" href="${telHref(site.mobile.tel)}">درخواست مشاوره: <span dir="ltr">${esc(site.mobile.display)}</span></a>
        <a class="btn btn--ghost" href="/services/">مشاهده‌ی خدمات</a>
      </div>
      <p class="hero__note">${esc(site.address.display)}، ${esc(site.hours.display)}</p>
    </div>
    <figure class="hero__figure">
      ${dieline({ animate: true, idPrefix: 'hero-dl', label: 'نقشه‌ی دایلاین یک جعبه‌ی تاشو؛ خط ممتد برش و خط‌چین تا' })}
      <figcaption>${dielineLegend()}</figcaption>
    </figure>
  </div>
</section>

<section class="section" aria-labelledby="services-title">
  <div class="wrap">
    <div class="section__head">
      <h2 id="services-title">خدمات طراحی بسته‌بندی</h2>
      <p>سه مرحله‌ی جدا و به‌هم‌وابسته: ساختار جعبه، گرافیک روی آن و فایل چاپ. می‌توانید یکی را سفارش بدهید یا هر سه را.</p>
    </div>
    ${listRows(services)}
  </div>
</section>

<section class="section section--wash" aria-labelledby="process-title">
  <div class="wrap">
    <div class="section__head">
      <h2 id="process-title">مراحل کار با ما</h2>
      <p>ترتیب کار مهم است: اول ساختار، بعد گرافیک، آخر فایل چاپ.</p>
    </div>
    <ol class="steps">
      ${steps.map(([t, d]) => `<li><h3>${esc(t)}</h3><p>${esc(d)}</p></li>`).join('')}
    </ol>
  </div>
</section>

<section class="section" aria-labelledby="why-title">
  <div class="wrap wrap--split">
    <div>
      <h2 id="why-title">چرا ساختار و گرافیک بسته را با هم طراحی می‌کنیم؟</h2>
    </div>
    <div class="prose">
      <p>گرافیک یک جعبه روی یک سطح تخت طراحی می‌شود، ولی مشتری آن را به شکل یک حجم می‌بیند. اگر خط تا از وسط یک لوگو بگذرد، محل چسب روی یک متن مهم بیفتد یا لبه‌ی برش به رنگ‌های حاشیه نزدیک باشد، بسته بعد از چاپ همان چیزی نیست که روی مانیتور دیده شد.</p>
      <p>به همین دلیل دایلاین را قبل از گرافیک می‌کشیم و فایل چاپ را بر پایه‌ی همان دایلاین تنظیم می‌کنیم. جزئیات هر مرحله در صفحه‌ی <a href="/services/structural-design/">طراحی ساختاری</a>، <a href="/services/packaging-graphic-design/">طراحی گرافیکی</a> و <a href="/services/print-file-preparation/">آماده‌سازی فایل چاپ</a> آمده است.</p>
    </div>
  </div>
</section>

<section class="section section--wash" aria-labelledby="industries-title">
  <div class="wrap">
    <div class="section__head">
      <h2 id="industries-title">صنایعی که برایشان طراحی می‌کنیم</h2>
      <p>هر صنعت الزامات اطلاعاتی، جنس و چاپ مخصوص خودش را دارد.</p>
    </div>
    <ul class="grid2">
      ${industries
        .map(
          (p) => `<li class="grid2__item"><h3><a href="${esc(p.url)}">${esc(p.data.title)}</a></h3><p>${esc(p.data.summary)}</p></li>`,
        )
        .join('')}
    </ul>
  </div>
</section>

${ctaBlock(ctx, { title: 'پروژه‌ی بسته‌بندی‌تان را برایمان توضیح دهید' })}`;

  return {
    main,
    schemas: [organizationSchema(site), websiteSchema(site)],
  };
}

/* ------------------------------------------------------------ generic prose page */
function prosePage(ctx, page, trail, { lead } = {}) {
  const extra = page.data.figure === 'dieline'
    ? `<figure class="figure figure--dieline">${dieline({ annotated: true, idPrefix: 'page-dl', label: 'نمونه‌ی دایلاین با نمایش طول، عرض و ارتفاع جعبه' })}<figcaption>${dielineLegend()}<span>نمونه‌ی ساده‌ی یک جعبه‌ی تاشو؛ طول، عرض و ارتفاع همه‌ی اندازه‌های دیگر را تعیین می‌کنند.</span></figcaption></figure>`
    : '';
  const main = `${pageHead(page.data.title, lead || page.data.summary, trail)}
<article class="section section--tight">
  <div class="wrap wrap--narrow">
    ${toc(page)}
    ${extra}
    <div class="prose">${page.html}</div>
  </div>
</article>
${related(ctx, page)}
${ctaBlock(ctx)}`;
  return { main };
}

/* ------------------------------------------------------------ indexes */
function collectionIndex(ctx, page, trail, items) {
  const main = `${pageHead(page.data.title, page.data.lead, trail)}
<section class="section section--tight">
  <div class="wrap wrap--narrow">
    ${page.html ? `<div class="prose prose--intro">${page.html}</div>` : ''}
    ${listRows(items)}
  </div>
</section>
${ctaBlock(ctx)}`;
  return { main };
}

function blogIndex(ctx, page, trail) {
  const posts = ctx.collections.blog;
  const main = `${pageHead(page.data.title, page.data.lead, trail)}
<section class="section section--tight"><div class="wrap wrap--narrow">
<ul class="rows">${posts
    .map(
      (p) => `<li class="row"><p class="row__meta"><time datetime="${esc(p.data.date)}">${esc(faDate(p.data.date))}</time></p><h3 class="row__title"><a href="${esc(p.url)}">${esc(p.data.title)}</a></h3><p class="row__text">${esc(p.data.description)}</p></li>`,
    )
    .join('')}</ul></div></section>
${ctaBlock(ctx)}`;
  return { main };
}

function blogPost(ctx, page, trail) {
  const meta = `<p class="meta">منتشر شده: <time datetime="${esc(page.data.date)}">${esc(faDate(page.data.date))}</time>${
    page.data.updated !== page.data.date ? ` · به‌روزرسانی: <time datetime="${esc(page.data.updated)}">${esc(faDate(page.data.updated))}</time>` : ''
  }</p>`;
  const main = `<section class="page-head"><div class="wrap wrap--narrow">${breadcrumbNav(trail)}<h1>${esc(page.data.title)}</h1>${meta}</div></section>
<article class="section section--tight"><div class="wrap wrap--narrow">${toc(page)}<div class="prose">${page.html}</div></div></article>
${related(ctx, page)}
${ctaBlock(ctx)}`;
  return { main, schemas: [articleSchema(ctx.site, page)] };
}

/* ------------------------------------------------------------ contact */
function contact(ctx, page, trail) {
  const { site } = ctx;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${site.address.display} ${site.name}`)}`;
  const main = `${pageHead(page.data.title, page.data.lead, trail)}
<section class="section section--tight">
  <div class="wrap wrap--narrow">
    <dl class="facts">
      <div><dt>آدرس دفتر</dt><dd>${esc(site.address.display)}<br><a href="${esc(mapsUrl)}" rel="noopener">مسیریابی روی نقشه</a></dd></div>
      <div><dt>تلفن</dt><dd><a href="${telHref(site.phone.tel)}" dir="ltr">${esc(site.phone.display)}</a></dd></div>
      <div><dt>موبایل و واتساپ</dt><dd><a href="${telHref(site.mobile.tel)}" dir="ltr">${esc(site.mobile.display)}</a><br><a href="https://wa.me/${esc(site.mobile.whatsapp)}" rel="noopener">ارسال پیام در واتساپ</a></dd></div>
      ${site.email ? `<div><dt>ایمیل</dt><dd><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></dd></div>` : ''}
      <div><dt>ساعت کاری</dt><dd>${esc(site.hours.short)}</dd></div>
    </dl>
    ${page.html ? `<div class="prose">${page.html}</div>` : ''}
  </div>
</section>`;
  return { main };
}

/* ------------------------------------------------------------ 404 */
function notFound(ctx, page) {
  const main = `<section class="page-head"><div class="wrap wrap--narrow">
<h1>${esc(page.data.title)}</h1>
<p class="lead">${esc(page.data.lead)}</p>
<p class="hero__actions"><a class="btn" href="/">رفتن به صفحه‌ی اصلی</a><a class="btn btn--ghost" href="/services/">مشاهده‌ی خدمات</a><a class="btn btn--ghost" href="/contact/">تماس با ما</a></p>
</div></section>`;
  return { main };
}

/* ------------------------------------------------------------ router */
export function breadcrumbTrail(ctx, page) {
  const home = { label: 'خانه', url: '/' };
  if (page.url === '/') return [home];
  const sectionLabel = ctx.site.sections[page.collection];
  const sectionUrl = `/${page.collection}/`;
  if (page.collection !== 'pages' && sectionLabel && ctx.byUrl.has(sectionUrl)) {
    return [home, { label: sectionLabel, url: sectionUrl }, { label: page.data.breadcrumb || page.data.title, url: page.url }];
  }
  return [home, { label: page.data.breadcrumb || page.data.title, url: page.url }];
}

export function renderPage(ctx, page) {
  const trail = page.template === '404' ? [] : breadcrumbTrail(ctx, page);
  let out;
  switch (page.template) {
    case 'home':
      out = home(ctx, page);
      break;
    case 'services-index':
      out = collectionIndex(ctx, page, trail, ctx.collections.services);
      break;
    case 'industries-index':
      out = collectionIndex(ctx, page, trail, ctx.collections.industries);
      break;
    case 'portfolio-index':
      out = collectionIndex(ctx, page, trail, ctx.collections.portfolio);
      break;
    case 'blog-index':
      out = blogIndex(ctx, page, trail);
      break;
    case 'blog-post':
      out = blogPost(ctx, page, trail);
      break;
    case 'contact':
      out = contact(ctx, page, trail);
      break;
    case '404':
      out = notFound(ctx, page);
      break;
    default:
      out = prosePage(ctx, page, trail);
  }
  const schemas = [...(out.schemas || [])];
  if (trail.length > 1) schemas.push(breadcrumbSchema(ctx.site, trail));
  const seoTitle = page.data.seo_title || (page.url === '/' ? page.data.title : `${page.data.title} | ${ctx.site.name}`);
  return document({ ctx, page, main: out.main, schemas, seoTitle });
}
