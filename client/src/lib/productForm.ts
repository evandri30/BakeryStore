// Turns the seller product form into the API payload (see server productController).
export function readProductForm(form: HTMLFormElement) {
  const d = new FormData(form)
  const text = (k: string) => String(d.get(k) ?? '').trim()
  const int = (k: string) => Number.parseInt(text(k), 10)
  return {
    name: text('name'),
    description: text('description').split('\n').map((l) => l.trim()).filter(Boolean),
    category: text('category'),
    price: int('price'),
    offerPrice: int('offerPrice'),
    stock: int('stock'),
    massGrams: int('massGrams'),
    expiredAt: text('expiredAt') || null,
  }
}
