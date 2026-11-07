import { esc, jsonForScript } from './util.js';

/** Remove empty values so the Schema never carries blank or made-up fields. */
export function compact(value) {
  if (Array.isArray(value)) {
    const arr = value.map(compact).filter((v) => v !== undefined);
    return arr.length ? arr : undefined;
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const c = compact(v);
      if (c !== undefined) out[k] = c;
    }
    return Object.keys(out).length ? out : undefined;
  }
  if (value === '' || value === null || value === undefined) return undefined;
  return value;
}

export const absolute = (site, p) => `${site.url}${p}`;

export function organizationSchema(site) {
  const socials = Object.values(site.social || {}).filter(Boolean);
  return compact({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${site.url}/#organization`,
    name: site.name,
    alternateName: site.nameEn,
    url: `${site.url}/`,
    logo: { '@type': 'ImageObject', url: `${site.url}/logo.png`, width: 512, height: 512 },
    telephone: [site.phone?.tel, site.mobile?.tel],
    email: site.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address?.street,
      addressLocality: site.address?.locality,
      addressRegion: site.address?.region,
      addressCountry: site.address?.country,
    },
    sameAs: socials,
  });
}

export function websiteSchema(site) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${site.url}/#website`,
    url: `${site.url}/`,
    name: site.name,
    inLanguage: 'fa-IR',
    publisher: { '@id': `${site.url}/#organization` },
  };
}

export function breadcrumbSchema(site, trail) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      item: absolute(site, c.url),
    })),
  };
}

export function articleSchema(site, page, imageUrl) {
  return compact({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: page.data.title,
    description: page.data.description,
    inLanguage: 'fa-IR',
    mainEntityOfPage: absolute(site, page.url),
    datePublished: page.data.date,
    dateModified: page.data.updated,
    image: imageUrl ? [imageUrl] : undefined,
    author: { '@type': 'Organization', name: site.name, url: `${site.url}/` },
    publisher: { '@id': `${site.url}/#organization` },
  });
}

export const ldScript = (obj) => `<script type="application/ld+json">${jsonForScript(obj)}</script>`;

export function metaTags({ site, page, seoTitle, ogImage }) {
  const url = absolute(site, page.url);
  const robots = page.noindex ? '<meta name="robots" content="noindex, nofollow">' : '<meta name="robots" content="index, follow, max-image-preview:large">';
  const ogType = page.template === 'blog-post' ? 'article' : 'website';
  const is404 = page.template === '404';
  const tags = [
    `<title>${esc(seoTitle)}</title>`,
    `<meta name="description" content="${esc(page.data.description)}">`,
    ...(is404 ? [] : [`<link rel="canonical" href="${esc(url)}">`]),
    robots,
    `<meta property="og:site_name" content="${esc(site.name)}">`,
    `<meta property="og:locale" content="${esc(site.locale)}">`,
    `<meta property="og:type" content="${ogType}">`,
    `<meta property="og:title" content="${esc(seoTitle)}">`,
    `<meta property="og:description" content="${esc(page.data.description)}">`,
    ...(is404 ? [] : [`<meta property="og:url" content="${esc(url)}">`]),
    `<meta property="og:image" content="${esc(absolute(site, ogImage.path))}">`,
    `<meta property="og:image:width" content="${ogImage.width}">`,
    `<meta property="og:image:height" content="${ogImage.height}">`,
    `<meta property="og:image:alt" content="${esc(ogImage.alt)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
  ];
  const a = site.analytics || {};
  if (a.searchConsoleVerification) tags.push(`<meta name="google-site-verification" content="${esc(a.searchConsoleVerification)}">`);
  if (a.bingVerification) tags.push(`<meta name="msvalidate.01" content="${esc(a.bingVerification)}">`);
  return tags.join('\n  ');
}
