import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import * as address from './controllers/addressController.js'
import * as cart from './controllers/cartController.js'
import * as favorite from './controllers/favoriteController.js'
import * as order from './controllers/orderController.js'
import * as product from './controllers/productController.js'
import * as seller from './controllers/sellerController.js'
import * as user from './controllers/userController.js'
import { imageUpload } from './integrations.js'
import { authSeller, authUser, optionalUser } from './middlewares/auth.js'

// shortcut: in-memory counter, so each serverless instance counts on its own.
// Enough to slow down password guessing on a portfolio site.
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, message: { success: false, message: 'Terlalu banyak percobaan, coba lagi nanti' } })

export const api = Router()

api.post('/user/register', loginLimit, user.register)
api.post('/user/login', loginLimit, user.login)
api.get('/user/is-auth', optionalUser, user.isAuth)
api.get('/user/logout', user.logout)

api.post('/seller/login', loginLimit, seller.login)
api.get('/seller/is-auth', seller.isAuth)
api.get('/seller/logout', seller.logout)
api.get('/seller/summary', authSeller, seller.summary)

api.get('/product/list', product.list)
// authSeller runs before multer, so anonymous uploads are rejected before any file is read.
api.post('/product/add', authSeller, imageUpload.array('images', 4), product.add)
api.put('/product/:id', authSeller, product.update)

api.get('/cart', authUser, cart.get)
api.put('/cart', authUser, cart.replace)

api.get('/favorite', authUser, favorite.list)
api.put('/favorite/:productId', authUser, favorite.add)
api.delete('/favorite/:productId', authUser, favorite.remove)

api.get('/address', authUser, address.list)
api.post('/address', authUser, address.add)

api.post('/order', authUser, order.place)
api.post('/order/midtrans/notification', order.midtransNotification)
api.get('/order/mine', authUser, order.mine)
api.post('/order/:id/check-payment', authUser, order.checkPayment)
api.post('/order/:id/payment-method', authUser, order.changePayment)
api.get('/order/seller', authSeller, order.all)
api.patch('/order/:id/status', authSeller, order.updateStatus)
