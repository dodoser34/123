(() => {
  const { ui } = App;

  function meta(p) {
    const shop = App.config.shopName;
    document.title = p.seoTitle ? p.seoTitle + ' | ' + shop : ui.t('product.seoTitle', { name: p.name, shop });
    let tag = document.querySelector('meta[name="description"]');
    if (!tag) {
      tag = document.createElement('meta');
      tag.name = 'description';
      document.head.appendChild(tag);
    }
    tag.content = p.seoDescription || p.short;
  }

  function jsonLd(p, rating, images) {
    let s = document.getElementById('ld-product');
    if (!s) {
      s = document.createElement('script');
      s.type = 'application/ld+json';
      s.id = 'ld-product';
      document.head.appendChild(s);
    }
    const data = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      sku: p.specs.sku || undefined,
      brand: { '@type': 'Brand', name: p.brand },
      description: p.short,
      image: images.filter(Boolean).map((i) => new URL(ui.url(i), location.href).href),
      offers: {
        '@type': 'Offer',
        priceCurrency: 'KZT',
        price: p.price,
        availability: p.stock <= 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock'
      }
    };
    if (rating.count) data.aggregateRating = { '@type': 'AggregateRating', ratingValue: rating.rating, reviewCount: rating.count };
    s.textContent = JSON.stringify(data);
  }

  App.productSeo = { meta, jsonLd };
})();
