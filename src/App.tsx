import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/lib/auth'
import { NotificationsProvider } from '@/lib/notifications'
import Notifications from '@/pages/Notifications'
import Layout from '@/components/Layout'
import { RequireAuth } from '@/components/RequireAuth'
import Home from '@/pages/Home'
import Search from '@/pages/Search'
import Live from '@/pages/Live'
import StorePage from '@/pages/StorePage'
import ProductPage from '@/pages/ProductPage'
import Login from '@/pages/Login'
import Following from '@/pages/Following'
import Account from '@/pages/Account'
import OpenStore from '@/pages/seller/OpenStore'
import SellerLayout from '@/pages/seller/SellerLayout'
import Dashboard from '@/pages/seller/Dashboard'
import Products from '@/pages/seller/Products'
import ProductForm from '@/pages/seller/ProductForm'
import Lives from '@/pages/seller/Lives'
import LiveSetup from '@/pages/seller/LiveSetup'
import LiveStudio from '@/pages/seller/LiveStudio'
import Shipping from '@/pages/seller/Shipping'
import StoreSettings from '@/pages/seller/StoreSettings'
import { NewBattle, SellerBattleDetail, SellerBattles } from '@/pages/seller/Battles'
import BattlePage from '@/pages/BattlePage'
import CampaignPage from '@/pages/CampaignPage'
import SellerCampaigns from '@/pages/seller/SellerCampaigns'
import { AdminCampaigns, AdminBattles, AdminCategories, AdminLayout, AdminLives, AdminOverview, AdminSettings, AdminStores } from '@/pages/admin/Admin'
import { Empty } from '@/components/ui'

export default function App() {
  return (
    <AuthProvider>
      <NotificationsProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="buscar" element={<Search />} />
            <Route path="ao-vivo" element={<Search liveOnly />} />
            <Route path="live/:id" element={<Live />} />
            <Route path="batalha/:id" element={<BattlePage />} />
            <Route path="campanha/:slug" element={<CampaignPage />} />
            <Route path="loja/:slug" element={<StorePage />} />
            <Route path="produto/:id" element={<ProductPage />} />
            <Route path="entrar" element={<Login />} />
            <Route path="seguindo" element={<Following />} />
            <Route path="avisos" element={<Notifications />} />
            <Route path="conta" element={<Account />} />
            <Route path="vender" element={<OpenStore />} />

            <Route path="vendedor" element={<RequireAuth seller><SellerLayout /></RequireAuth>}>
              <Route index element={<Dashboard />} />
              <Route path="produtos" element={<Products />} />
              <Route path="produtos/:id" element={<ProductForm />} />
              <Route path="lives" element={<Lives />} />
              <Route path="lives/nova" element={<LiveSetup />} />
              <Route path="batalhas" element={<SellerBattles />} />
              <Route path="batalhas/nova" element={<NewBattle />} />
              <Route path="batalhas/:id" element={<SellerBattleDetail />} />
              <Route path="campanhas" element={<SellerCampaigns />} />
              <Route path="frete" element={<Shipping />} />
              <Route path="loja" element={<StoreSettings />} />
            </Route>
            <Route path="vendedor/live/:id" element={<RequireAuth seller><LiveStudio /></RequireAuth>} />

            <Route path="admin" element={<RequireAuth admin><AdminLayout /></RequireAuth>}>
              <Route index element={<AdminOverview />} />
              <Route path="lojas" element={<AdminStores />} />
              <Route path="lives" element={<AdminLives />} />
              <Route path="batalhas" element={<AdminBattles />} />
              <Route path="campanhas" element={<AdminCampaigns />} />
              <Route path="categorias" element={<AdminCategories />} />
              <Route path="configuracoes" element={<AdminSettings />} />
            </Route>

            <Route path="*" element={<Empty title="Página não encontrada">Confira o endereço ou volte para o início.</Empty>} />
          </Route>
        </Routes>
        <Toaster theme="dark" position="top-center" toastOptions={{ style: { background: '#261C42', border: '1px solid #352A57', color: '#EDE9F7' } }} />
      </BrowserRouter>
      </NotificationsProvider>
    </AuthProvider>
  )
}
