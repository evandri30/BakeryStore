import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { Route, Routes, useLocation } from 'react-router'
import { StoreLayout } from './components/StoreLayout'
import AddAddress from './pages/AddAddress'
import Cart from './pages/Cart'
import Favorites from './pages/Favorites'
import Home from './pages/Home'
import MyOrders from './pages/MyOrders'
import NotFound from './pages/NotFound'
import ProductDetail from './pages/ProductDetail'
import Products from './pages/Products'
import AddProduct from './pages/seller/AddProduct'
import Dashboard from './pages/seller/Dashboard'
import SellerOrders from './pages/seller/Orders'
import ProductList from './pages/seller/ProductList'
import SellerLayout from './pages/seller/SellerLayout'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Toaster position="top-center" toastOptions={{ style: { borderRadius: '999px', background: 'var(--color-kertas)', color: 'var(--color-cokelat)' } }} />
      <Routes>
        <Route element={<StoreLayout />}>
          <Route index element={<Home />} />
          <Route path="products" element={<Products />} />
          <Route path="products/:category" element={<Products />} />
          <Route path="products/:category/:id" element={<ProductDetail />} />
          <Route path="cart" element={<Cart />} />
          <Route path="add-address" element={<AddAddress />} />
          <Route path="my-orders" element={<MyOrders />} />
          <Route path="favorites" element={<Favorites />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        {/* SellerLayout shows the admin login until the seller is signed in, for every route below. */}
        <Route path="seller" element={<SellerLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<SellerOrders />} />
          <Route path="products" element={<ProductList />} />
          <Route path="products/new" element={<AddProduct />} />
        </Route>
      </Routes>
    </>
  )
}
