export const categories = [
  { name: 'Roti', slug: 'roti', image: '/products/roti-tawar.webp' },
  { name: 'Brownies', slug: 'brownies', image: '/products/brownies-panggang.webp' },
  { name: 'Donat', slug: 'donat', image: '/products/donat-gula.webp' },
  { name: 'Puding', slug: 'puding', image: '/products/puding-cokelat.webp' },
  { name: 'Aneka Bolu', slug: 'aneka-bolu', image: '/products/bolu-pandan.webp' },
] as const

export const categoryBySlug = (slug: string | undefined) => categories.find((c) => c.slug === slug)
export const slugOf = (categoryName: string) =>
  categories.find((c) => c.name === categoryName)?.slug ?? categoryName.toLowerCase().replace(/\s+/g, '-')
