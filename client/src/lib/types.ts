// Shapes returned by the API (server/src/controllers). Dates arrive as ISO strings.

export type Product = {
  id: string
  name: string
  description: string[]
  price: number
  offerPrice: number
  images: string[]
  category: string
  stock: number
  massGrams: number
  expiredAt: string | null
  createdAt: string
  updatedAt: string
}

export type User = { id: string; name: string; email: string }

export type Address = {
  id: string
  firstName: string
  lastName: string
  email: string
  street: string
  city: string
  state: string
  zipcode: string
  country: string
  phone: string
}

export type OrderStatus = 'PROCESSING' | 'PACKING' | 'SHIPPING' | 'DONE' | 'CANCELLED'
export type PaymentType = 'COD' | 'ONLINE'

export type Order = {
  id: string
  amount: number
  paymentType: PaymentType
  isPaid: boolean
  status: OrderStatus
  snapToken: string | null
  createdAt: string
  address: Address
  items: { id: string; quantity: number; unitPrice: number; product: Product }[]
}

/** productId -> quantity */
export type Cart = Record<string, number>
