// midtrans-client ships no types; only the part we use is declared.
declare module 'midtrans-client' {
  type SnapTransaction = { token: string; redirect_url: string }
  class Snap {
    constructor(options: { isProduction: boolean; serverKey: string; clientKey?: string })
    createTransaction(parameter: Record<string, unknown>): Promise<SnapTransaction>
    transaction: {
      status(orderId: string): Promise<{ transaction_status: string; fraud_status?: string }>
      expire(orderId: string): Promise<unknown>
    }
  }
  const midtransClient: { Snap: typeof Snap }
  export default midtransClient
}
