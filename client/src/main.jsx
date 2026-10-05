import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate, useParams, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Filter, LogOut, MapPin, Menu as MenuIcon, MessageCircle, Minus, Phone, Plus, Search, ShoppingBag, Star, X, Upload, Headphones, Sparkles, Mail, CheckCircle, Trash2, ArrowRight, ShoppingCart, ChevronLeft, ChevronRight, Check, AlertCircle, Home, FileText } from 'lucide-react';
import { api } from './api';
import './styles.css';
import './admin.css';
import './features.css';

const Auth = createContext();
const Cart = createContext();
const useAuth = () => useContext(Auth);
const useCart = () => useContext(Cart);

const format = number => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(number || 0);

const statusLabels = {
  request_received: 'Order request received',
  contacting_customer: 'We are contacting you',
  awaiting_confirmation: 'Awaiting confirmation',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready_for_pickup: 'Ready for pickup',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

const ITEMS_PER_PAGE = 6;
const DEFAULT_CATEGORY_IMAGE = 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=900&q=80';

function LoadingState({ label = 'Loading fresh snacks...' }) {
  return <div className="loading-state" role="status"><span className="loading-spinner" /><p>{label}</p></div>;
}

/* ------------------------------------------------------------------ */
/* Scroll To Top Component (Resets scroll position on navigation)    */
/* ------------------------------------------------------------------ */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/* ------------------------------------------------------------------ */
/* Preparation Range Formatter Helper                                 */
/* ------------------------------------------------------------------ */
const formatPrepTime = snack => {
  if (!snack) return '';
  if (snack.preparationType === 'instant') return 'Available now';
  const min = Number(snack.minimumPreparationDays || 1);
  const max = Number(snack.maximumPreparationDays || min);
  if (min === max || max <= min) {
    return `Ready in ${min} day${min !== 1 ? 's' : ''}`;
  }
  return `Ready in ${min}–${max} days`;
};

/* ------------------------------------------------------------------ */
/* Add To Cart Confirmation Modal Component                          */
/* ------------------------------------------------------------------ */
function AddToCartModal({ snack, onClose, onGoToCart }) {
  if (!snack) return null;
  const imgUrl = snack.imageUrl || snack.imageUrls?.[0];
  const unit = snack.unit === 'kg' ? 'kg' : snack.unit === 'litre' ? 'litre' : 'piece';

  return (
    <div className="add-cart-overlay" onClick={onClose}>
      <div className="add-cart-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>
        <div className="add-cart-header">
          <CheckCircle size={24} />
          <span>Added to Your Cart!</span>
        </div>

        <div className="add-cart-snack-info">
          {imgUrl ? <img src={imgUrl} alt={snack.name} /> : <div style={{ width: 64, height: 64, background: '#dce8d5', borderRadius: 10, display: 'grid', placeItems: 'center', fontWeight: 'bold', fontSize: 24, color: '#276044' }}>{snack.name[0]}</div>}
          <div>
            <h4>{snack.name}</h4>
            <p><strong>{format(snack.price)}</strong> / {unit}</p>
            <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>Full payment on confirmation/delivery</span>
          </div>
        </div>

        <div className="add-cart-actions">
          <button type="button" className="button" onClick={onGoToCart} style={{ gap: 6 }}>
            <ShoppingCart size={16} /> View Cart & Checkout
          </button>
          <button type="button" className="button" style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1' }} onClick={onClose}>
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Order Success Popup Modal Component                                */
/* ------------------------------------------------------------------ */
function OrderSuccessModal({ open, order, onClose, onViewOrders }) {
  if (!open) return null;

  return (
    <div className="order-success-overlay">
      <div className="order-success-modal" onClick={e => e.stopPropagation()}>
        <div className="success-icon-wrap">
          <Check size={36} strokeWidth={3} />
        </div>
        <div>
          <h2>Thank You for Ordering!</h2>
          <p style={{ marginTop: 6, fontWeight: 500, color: '#15803d' }}>Reddy's Home Foods has received your order request.</p>
        </div>

        <div className="call-badge-notice">
          <Phone size={24} style={{ flexShrink: 0 }} />
          <div>
            <strong>We will contact you in 10–15 minutes!</strong>
            <div style={{ fontSize: '12px', marginTop: 2 }}>Our team will call or WhatsApp your number to confirm your order items and preparation timing.</div>
          </div>
        </div>

        {order && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px', textAlign: 'left', fontSize: '13px' }}>
            <div><strong>Order ID:</strong> #{order._id.slice(-6).toUpperCase()}</div>
            <div><strong>Items:</strong> {order.items.map(i => `${i.name} × ${i.quantity}`).join(', ')}</div>
            <div><strong>Total Amount:</strong> {format(order.totalAmount)}</div>
            <div><strong>Fulfilment:</strong> {order.fulfilment === 'delivery' ? 'Home Delivery' : 'Store Pickup'}</div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button type="button" className="button" onClick={onViewOrders} style={{ gap: 6 }}>
            <FileText size={16} /> View My Orders
          </button>
          <button type="button" className="button" style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', gap: 6 }} onClick={onClose}>
            <Home size={16} /> Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Customer Care Modal Component                                      */
/* ------------------------------------------------------------------ */
function CustomerCareModal({ open, onClose }) {
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data.settings)
  });
  if (!open) return null;
  const phone = settingsData?.storePhone || '+91 98765 43210';
  const email = settingsData?.storeEmail || 'support@reddyshomefoods.com';
  const address = settingsData?.storeAddress || "Reddy's Home Foods, Main Road, Gourmet Plaza, Suite 10";
  const notice = settingsData?.customerCareNotice || "Available Mon-Sat 9 AM - 9 PM for order confirmation, custom batches & support at Reddy's Home Foods.";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="customer-care-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>
        <div className="care-header">
          <p className="eyebrow"><Headphones size={14} style={{ display: 'inline', marginRight: 4 }} /> Customer Support</p>
          <h2>Support & Help Center</h2>
          <p className="muted" style={{ margin: '4px 0 0' }}>{notice}</p>
        </div>

        <div className="care-cards">
          <a href={`tel:${phone.replace(/\s+/g, '')}`} className="care-card">
            <Phone size={20} />
            <strong>Call Us Directly</strong>
            <span>{phone}</span>
          </a>
          <a href={`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent("Hello Reddy's Home Foods, I have an inquiry about my order.")}`} target="_blank" rel="noreferrer" className="care-card">
            <MessageCircle size={20} />
            <strong>WhatsApp Support</strong>
            <span>Direct WhatsApp chat & confirmation</span>
          </a>
          <a href={`mailto:${email}`} className="care-card">
            <Mail size={20} />
            <strong>Email Support</strong>
            <span>{email}</span>
          </a>
          <div className="care-card" style={{ cursor: 'default' }}>
            <Clock size={20} />
            <strong>Store Service Hours</strong>
            <span>{settingsData?.instantStartTime || '09:00'} - {settingsData?.instantEndTime || '20:00'} IST</span>
          </div>
        </div>

        <div className="pickup-box">
          <MapPin size={22} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <h4>Store Pickup Location</h4>
            <p>{address}</p>
          </div>
        </div>

        <div className="faq-section">
          <h3>How Ordering & Confirmation Works</h3>
          <details className="faq-item" open>
            <summary>What happens after I place an order request?</summary>
            <p>1. Select your favorite snacks and place your request.<br />2. Our team calls or WhatsApp messages you within 10–15 minutes to confirm details.<br />3. We prepare your fresh batch for Store Pickup or Doorstep Delivery!</p>
          </details>
          <details className="faq-item">
            <summary>how do I need to pay?</summary>
            <p>Full payment is confirmed over call/WhatsApp through our team</p>
          </details>
          <details className="faq-item">
            <summary>Can I pick up my order from the store?</summary>
            <p>Yes! Select 'Store Pickup' at checkout to collect your fresh batch directly from our store address above.</p>
          </details>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Header Navigation                                                 */
/* ------------------------------------------------------------------ */
function Header({ onOpenCare }) {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const closeMenu = () => setOpen(false);
  const admin = user?.role === 'admin';

  return (
    <header>
      <div className="header-inner">
        <Link className="brand" to="/" onClick={closeMenu}>
          Reddy's<span> Home Foods</span>
        </Link>
        <button className={`menu-toggle ${open ? 'is-open' : ''}`} type="button" onClick={() => setOpen(v => !v)} aria-label="Toggle menu">
          <MenuIcon size={20} />
        </button>
        <nav className={`nav-links ${open ? 'open' : ''}`}>
          <Link to="/" onClick={closeMenu}>Home</Link>
          <Link to="/categories" onClick={closeMenu}>Browse snacks</Link>
          {!admin && user && (
            <>
              <Link to="/orders" onClick={closeMenu}>My orders</Link>
              <Link to="/profile" onClick={closeMenu}>My profile</Link>
            </>
          )}
          {admin && (
            <>
              <Link to="/order-desk" onClick={closeMenu}>Order Desk & Settings</Link>
              <Link to="/menu-manager" onClick={closeMenu}>Menu Manager</Link>
            </>
          )}
          {!admin && (
            <Link className="cart-link" to="/cart" onClick={closeMenu}>
              <ShoppingBag size={18} /> Cart <b>{count}</b>
            </Link>
          )}
          {user ? (
            <button className="text-btn" onClick={() => { logout(); closeMenu(); }}>
              <LogOut size={17} /> Logout
            </button>
          ) : (
            <Link className="button small" to="/login" onClick={closeMenu}>Login</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Footer                                                            */
/* ------------------------------------------------------------------ */
function Footer({ onOpenCare }) {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data.settings)
  });
  return (
    <footer style={{ background: '#1c2820', color: '#e2e8f0', padding: '50px 24px 30px', marginTop: '80px', borderTop: '1px solid #2d3e32' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '32px' }}>
        <div>
          <h3 style={{ color: '#fff', fontSize: '24px', margin: '0 0 12px', fontFamily: "'Outfit', sans-serif" }}>Reddy's<span style={{ color: '#f59e0b' }}> Home Foods</span></h3>
          <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6' }}>Authentic handcrafted homemade snacks prepared fresh after your request. Fast pickup & doorstep delivery.</p>
        </div>
        <div>
          <h4 style={{ color: '#fff', margin: '0 0 14px', fontSize: '16px' }}>Store Pickup Location</h4>
          <p style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: '1.6', display: 'flex', gap: 6 }}>
            <MapPin size={16} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
            {settings?.storeAddress || "Reddy's Home Foods, Main Road, Gourmet Plaza, Suite 10"}
          </p>
        </div>
        <div>
          <h4 style={{ color: '#fff', margin: '0 0 14px', fontSize: '16px' }}>Need Help?</h4>
          <p style={{ color: '#cbd5e1', fontSize: '13px', margin: '0 0 8px', display: 'flex', gap: 6 }}>
            <Phone size={15} style={{ color: '#10b981' }} /> {settings?.storePhone || '+91 98765 43210'}
          </p>
          <p style={{ color: '#cbd5e1', fontSize: '13px', margin: '0 0 14px', display: 'flex', gap: 6 }}>
            <Mail size={15} style={{ color: '#3b82f6' }} /> {settings?.storeEmail || 'support@reddyshomefoods.com'}
          </p>
          <button type="button" className="button small" onClick={onOpenCare} style={{ background: '#276044' }}>
            <Headphones size={15} style={{ marginRight: 5 }} />Customer Care
          </button>
        </div>
      </div>
      <div style={{ maxWidth: '1200px', margin: '40px auto 0', paddingTop: '20px', borderTop: '1px solid #2d3e32', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
        © {new Date().getFullYear()} Reddy's Home Foods. All rights reserved. Made fresh with authentic care.
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* Main App Shell                                                     */
/* ------------------------------------------------------------------ */
function AppShell() {
  const [user, setUser] = useState(undefined);
  const [items, setItems] = useState(() => JSON.parse(localStorage.getItem('snack-cart') || '[]'));
  const [addedSnackModal, setAddedSnackModal] = useState(null);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [showCareModal, setShowCareModal] = useState(false);
  const nav = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    api.get('/auth/me').then(result => setUser(result.data.user)).catch(() => setUser(null));
  }, []);

  useEffect(() => localStorage.setItem('snack-cart', JSON.stringify(items)), [items]);

  const cart = useMemo(() => ({
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    add: snack => {
      setItems(old => {
        const cartKey = snack.cartKey || snack._id;
        const current = old.find(item => (item.cartKey || item._id) === cartKey);
        return current ? old.map(item => (item.cartKey || item._id) === cartKey ? { ...item, quantity: item.quantity + 1 } : item) : [...old, { ...snack, cartKey, quantity: 1 }];
      });
      setAddedSnackModal(snack);
    },
    change: (id, quantity) => setItems(old => quantity < 1 ? old.filter(item => (item.cartKey || item._id) !== id) : old.map(item => (item.cartKey || item._id) === id ? { ...item, quantity } : item)),
    clear: () => setItems([])
  }), [items]);

  return (
    <Auth.Provider value={{ user, setUser, logout: async () => { await api.post('/auth/logout'); setUser(null); qc.clear(); nav('/'); } }}>
      <Cart.Provider value={cart}>
        <ScrollToTop />
        <Header onOpenCare={() => setShowCareModal(true)} />
        <AddToCartModal snack={addedSnackModal} onClose={() => setAddedSnackModal(null)} onGoToCart={() => { setAddedSnackModal(null); nav('/cart'); }} />
        <OrderSuccessModal open={!!placedOrder} order={placedOrder} onClose={() => setPlacedOrder(null)} onViewOrders={() => { setPlacedOrder(null); nav('/orders'); }} />
        <CustomerCareModal open={showCareModal} onClose={() => setShowCareModal(false)} />
        <main style={{ minHeight: '75vh' }}>
          <Routes>
            <Route path="/" element={<EnhancedHome onOpenCare={() => setShowCareModal(true)} />} />
            <Route path="/categories" element={<CategoryBrowse />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/snack/:id" element={<SnackDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/cart" element={<CartPage onOpenCare={() => setShowCareModal(true)} />} />
            <Route path="/checkout" element={<Checkout onOpenCare={() => setShowCareModal(true)} onOrderSuccess={order => setPlacedOrder(order)} />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/order-desk" element={<EnhancedOrderDesk />} />
            <Route path="/menu-manager" element={<EnhancedMenuManager />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        <Footer onOpenCare={() => setShowCareModal(true)} />
      </Cart.Provider>
    </Auth.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Snack Card Component                                               */
/* ------------------------------------------------------------------ */
function Rating({ snack }) {
  return snack.reviewCount ? (
    <span className="rating"><Star size={14} fill="currentColor" /> {snack.averageRating} <small>({snack.reviewCount})</small></span>
  ) : (
    <span className="no-rating">New · Fresh batch</span>
  );
}

function SnackCard({ snack }) {
  const { add } = useCart();
  const instant = snack.preparationType === 'instant';
  const unit = snack.unit === 'kg' ? 'kg' : snack.unit === 'litre' ? 'litre' : 'piece';
  const imgUrl = snack.imageUrl || snack.imageUrls?.[0];
  const isFav = snack.isFavorite || snack.isPopular;

  return (
    <article className="card">
      <Link to={`/snack/${snack._id}`}>
        <div className="image">
          {isFav && <span className="fav-badge"><Sparkles size={12} /> Popular</span>}
          {imgUrl ? <img src={imgUrl} alt={snack.name} style={{ objectFit: 'cover', width: '100%', height: '100%' }} /> : <span>{snack.name.slice(0, 1)}</span>}
          <div className={`badge ${instant ? 'instant-badge' : ''}`}>
            <Clock size={13} />
            {formatPrepTime(snack)}
          </div>
        </div>
      </Link>
      <div className="card-body">
        <p className="category">{instant ? 'Available now · ' : ''}{snack.category}</p>
        <Link to={`/snack/${snack._id}`}>
          <h3>{snack.name}</h3>
        </Link>
        <Rating snack={snack} />
        <p className="description">{snack.description || 'Handcrafted fresh with care after your order request is confirmed.'}</p>
        <div className="prices">
          <strong>{format(snack.price)} <small style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>/ {unit}</small></strong>
          <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>Full Price</span>
        </div>
        <div className="card-footer">
          <span>{snack.pickupAvailable && 'Pickup'}{snack.pickupAvailable && snack.deliveryAvailable && ' · '}{snack.deliveryAvailable && 'Delivery'}</span>
          <button className="button small" onClick={() => add(snack)}>Add to cart</button>
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Homepage Ticker / Auto-scroll Rail for Favorite Items               */
/* ------------------------------------------------------------------ */
function PopularRail({ snacks }) {
  const railRef = useRef(null);
  const displayItems = snacks.length < 4 ? [...snacks, ...snacks, ...snacks, ...snacks] : [...snacks, ...snacks];

  return (
    <div className="hero-scroll-container">
      <div className="ticker-wrapper" ref={railRef}>
        {displayItems.map((snack, index) => (
          <div className="rail-card" key={`${snack._id}-${index}`}>
            <SnackCard snack={snack} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Enhanced Homepage                                                  */
/* ------------------------------------------------------------------ */
function EnhancedHome({ onOpenCare }) {
  const { data: snacks = [] } = useQuery({
    queryKey: ['snacks'],
    queryFn: () => api.get('/snacks').then(r => r.data.snacks)
  });

  const favorites = snacks.filter(s => s.isFavorite || s.isPopular);
  const railItems = favorites.length ? favorites : snacks.slice(0, 8);

  return (
    <>
      <section className="hero">
        <p className="eyebrow"><Sparkles size={14} style={{ display: 'inline', marginRight: 4 }} /> Authentic Kitchen</p>
        <h1>Authentic Homemade Snacks <em>Prepared Fresh for You.</em></h1>
        <p>Order delicious homemade delicacies. Fresh ingredients, traditional recipes, fast order confirmation within 10–15 minutes!</p>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <Link className="button" to="/categories">Explore Full Menu</Link>
          <button type="button" className="button" style={{ background: '#ffffff', color: '#1f2937', border: '1px solid #cbd5e1' }} onClick={onOpenCare}>
            <Headphones size={17} style={{ marginRight: 6 }} /> Customer Care
          </button>
        </div>
      </section>

      <section className="trust-strip">
        <div>
          <b>Fresh Homemade Cooking</b>
          <span>Prepared strictly after your request</span>
        </div>
        <div>
          <b>Fast Order Confirmation</b>
          <span>Our team contacts you within 10–15 mins to confirm</span>
        </div>
        <div>
          <b>Store Pickup or Delivery</b>
          <span>Pick up at gourmet store or doorstep delivery</span>
        </div>
      </section>

      <section className="section">
        <div className="section-title">
          <div>
            <p className="eyebrow">Featured Selections</p>
            <h2>Popular Homemade Snacks</h2>
          </div>
          <Link className="text-btn" to="/categories">See all snacks →</Link>
        </div>
        <p className="muted" style={{ margin: '-15px 0 20px' }}>Handcrafted fresh after your order request is placed.</p>
        {railItems.length ? <PopularRail snacks={railItems} /> : <div className="empty">New snacks arriving soon. Check back shortly!</div>}
      </section>

      <section className="section how">
        <p className="eyebrow">How It Works</p>
        <h2>4 Steps: From Request to Fresh Batch</h2>
        <div className="how-grid">
          <div>
            <b>1</b>
            <h3>Select & Send Request</h3>
            <p>Select your favorite snacks and send your request.</p>
          </div>
          <div>
            <b>2</b>
            <h3>Instant Request Alert</h3>
            <p>Our kitchen team immediately receives your order details.</p>
          </div>
          <div>
            <b>3</b>
            <h3>Call / WhatsApp Confirmation</h3>
            <p>We call or message you within 10–15 mins to confirm details.</p>
          </div>
          <div>
            <b>4</b>
            <h3>Fresh Preparation</h3>
            <p>We prepare your fresh batch for Pickup or Doorstep Delivery!</p>
          </div>
        </div>
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Menu Page                                                          */
/* ------------------------------------------------------------------ */
function CategoryBrowse() {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data.categories)
  });

  return (
    <section className="section category-page">
      <div className="category-page-hero">
        <p className="eyebrow">Find your favourite</p>
        <h1>Browse by category</h1>
        <p>Choose a collection to explore freshly prepared snacks, sweets, savouries, and more.</p>
      </div>
      {isLoading ? <LoadingState label="Loading snack categories..." /> : categories.length ? (
        <div className="category-card-grid">
          {categories.map(category => (
            <Link className="category-card" to={'/menu?category=' + encodeURIComponent(category.name)} key={category._id}>
              <div className="category-card-image">
                <img src={category.imageUrl || DEFAULT_CATEGORY_IMAGE} alt={category.name} />
              </div>
              <div><h2>{category.name}</h2><p>{category.snackCount} snack{category.snackCount !== 1 ? 's' : ''} to explore</p></div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty">The snack collections are being prepared. Please check back shortly.</div>
      )}
    </section>
  );
}

function Menu() {
  const { data: snacks = [], isLoading } = useQuery({
    queryKey: ['snacks'],
    queryFn: () => api.get('/snacks').then(r => r.data.snacks)
  });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [days, setDays] = useState('all');
  const location = useLocation();

  useEffect(() => {
    setCategory(new URLSearchParams(location.search).get('category') || 'all');
  }, [location.search]);

  const categories = [...new Set(snacks.map(snack => snack.category))];
  const filtered = snacks.filter(snack =>
    (!search || snack.name.toLowerCase().includes(search.toLowerCase())) &&
    (category === 'all' || snack.category === category) &&
    (days === 'all' || (days === 'instant' ? snack.preparationType === 'instant' : days === 'quick' ? snack.preparationType !== 'instant' && snack.minimumPreparationDays <= 2 : snack.preparationType !== 'instant' && snack.minimumPreparationDays >= 3))
  );

  return (
    <section className="section">
      <div className="section-title">
        <div>
          <p className="eyebrow">Reddy's Home Foods Catalogue</p>
          <h1>Browse Snacks</h1>
        </div>
        <p className="muted">Click any item to view photos, reviews, and details.</p>
      </div>

      <div className="filters">
        <label>
          <Search size={17} />
          <input placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} />
        </label>
        <label>
          <Filter size={17} />
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label>
          <Clock size={17} />
          <select value={days} onChange={e => setDays(e.target.value)}>
            <option value="all">Any Preparation Time</option>
            <option value="instant">Available Now</option>
            <option value="quick">Ready in 0–2 Days</option>
            <option value="longer">3+ Days Preparation</option>
          </select>
        </label>
      </div>

      {isLoading ? (
        <LoadingState label="Loading the snack catalogue..." />
      ) : (
        <>
          <p className="results">{filtered.length} snack{filtered.length !== 1 ? 's' : ''} available</p>
          <div className="grid">
            {filtered.map(snack => <SnackCard key={snack._id} snack={snack} />)}
          </div>
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Snack Detail Page                                                  */
/* ------------------------------------------------------------------ */
function SnackDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { add } = useCart();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [activeImg, setActiveImg] = useState(0);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [weightGrams, setWeightGrams] = useState(250);
  const [customKg, setCustomKg] = useState('0.25');

  const { data: snackResult, isLoading } = useQuery({
    queryKey: ['snack', id],
    queryFn: () => api.get(`/snacks/${id}`).then(r => r.data)
  });
  const { data: reviewResult } = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => api.get(`/reviews/snack/${id}`).then(r => r.data)
  });
  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get('/orders/my-orders').then(r => r.data.orders),
    enabled: !!user
  });

  const delivered = orders.find(order => order.status === 'delivered' && order.items.some(i => i.snack === id || i.snack?._id === id));

  const reviewMutation = useMutation({
    mutationFn: () => api.post('/reviews', { snackId: id, orderId: delivered._id, rating, comment }),
    onSuccess: () => {
      setComment('');
      qc.invalidateQueries({ queryKey: ['reviews', id] });
      qc.invalidateQueries({ queryKey: ['snack', id] });
    }
  });

  if (isLoading) return <section className="section"><LoadingState label="Preparing the snack details..." /></section>;
  const snack = snackResult?.snack;
  if (!snack) return <section className="section">Snack item not found.</section>;

  const images = snack.imageUrls?.length ? snack.imageUrls : snack.imageUrl ? [snack.imageUrl] : [];
  const instant = snack.preparationType === 'instant';
  const unit = snack.unit === 'kg' ? 'kg' : snack.unit === 'litre' ? 'litre' : 'piece';
  const isWeightPriced = snack.unit === 'kg';
  const chosenKg = weightGrams / 1000;
  const selectedSnack = isWeightPriced ? { ...snack, weightGrams, cartKey: snack._id + '-' + weightGrams } : snack;
  const displayWeight = grams => grams >= 1000 ? (grams / 1000).toFixed(2).replace(/\\.00$/, '').replace(/(\\.\\d)0$/, '$1') + ' kg' : grams + ' g';
  const setWeight = grams => {
    const safe = Math.max(250, Math.min(50000, Math.round(grams / 250) * 250));
    setWeightGrams(safe);
    setCustomKg((safe / 1000).toString());
  };
  const updateCustomKg = value => {
    const next = value.replace(',', '.');
    if (!/^\d*(?:\.\d*)?$/.test(next)) return;
    const [, decimal = ''] = next.split('.');
    // Permit only the partial values needed to type .25, .5, or .75.
    if (decimal && !['2', '5', '7', '25', '50', '75'].includes(decimal)) return;
    if (Number(next) > 50) return;
    setCustomKg(next);
    const validQuarterKg = /^\d+(?:\.(?:25|5|50|75))?$/.test(next);
    if (validQuarterKg && Number(next) >= 0.25) setWeight(Number(next) * 1000);
  };

  return (
    <section className="section product-page">
      <Link className="back-link" to="/menu">← Back to all snacks</Link>
      <div className="product-layout">
        <div className="product-gallery">
          <div className="main-product-image">
            {images.length ? <img src={images[activeImg]} alt={snack.name} /> : <span>{snack.name[0]}</span>}
          </div>
          {images.length > 1 && (
            <div className="product-thumbnails">
              {images.map((url, i) => (
                <button type="button" key={url} className={i === activeImg ? 'active' : ''} onClick={() => setActiveImg(i)}>
                  <img src={url} alt={`${snack.name} preview ${i + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="product-copy">
          <p className="category">{instant ? 'Available Now · ' : ''}{snack.category}</p>
          <h1>{snack.name}</h1>
          <Rating snack={snack} />
          <p style={{ margin: '14px 0 20px', lineHeight: 1.7 }}>{snack.description || 'Handcrafted fresh upon order confirmation.'}</p>
          <div className="product-facts">
            <span><Clock size={17} /> {formatPrepTime(snack)}</span>
            <span>{snack.pickupAvailable && 'Pickup'}{snack.pickupAvailable && snack.deliveryAvailable && ' · '}{snack.deliveryAvailable && 'Delivery'}</span>
          </div>
          <strong className="product-price">{format(snack.price)} <small style={{ fontSize: '16px', color: '#64748b' }}>per {unit}</small></strong>
          <p style={{ color: '#16a34a', fontWeight: 600, margin: '8px 0 20px' }}>Full payment upon confirmation / delivery. Zero advance required.</p>
          {isWeightPriced && (
            <div className="weight-selector">
              <div className="weight-selector-head">
                <div><b>Choose quantity</b><span>Priced at {format(snack.price)} per kg</span></div>
                <strong>{displayWeight(weightGrams)}</strong>
              </div>
              <div className="weight-custom-row">
                <div className="weight-stepper" aria-label="Adjust weight by 250 grams">
                  <button type="button" onClick={() => setWeight(weightGrams - 250)} aria-label="Reduce weight"><Minus size={16} /></button>
                  <span>{displayWeight(weightGrams)}</span>
                  <button type="button" onClick={() => setWeight(weightGrams + 250)} aria-label="Increase weight"><Plus size={16} /></button>
                </div>
                <label>Quantity in kg
                  <input type="text" inputMode="decimal" aria-describedby="weight-step-help" placeholder="e.g. 1.75" value={customKg} onChange={e => updateCustomKg(e.target.value)} onBlur={() => {
                    if (!/^\d+(?:\.(?:25|5|50|75))?$/.test(customKg) || Number(customKg) < 0.25) setCustomKg((weightGrams / 1000).toString());
                  }} />
                </label>
              </div>
              <small id="weight-step-help" className="weight-step-help">For 1 kg and 250 g, enter 1.25. For 1 kg and 500 g, enter 1.5; for 1 kg and 750 g, enter 1.75.</small>
              <p className="weight-total">Selected {displayWeight(weightGrams)} · Item total <b>{format(snack.price * chosenKg)}</b></p>
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="button" onClick={() => add(selectedSnack)}>
              <ShoppingBag size={18} style={{ marginRight: 6 }} /> Add to Cart
            </button>
            <button className="button" style={{ background: '#16a34a' }} onClick={() => { add(selectedSnack); nav('/cart'); }}>
              Buy Now / Checkout
            </button>
          </div>
        </div>
      </div>

      <div className="reviews">
        <div className="section-title">
          <div>
            <p className="eyebrow">Verified Customers</p>
            <h2>Customer Reviews</h2>
          </div>
          {reviewResult?.summary?.count ? <Rating snack={{ averageRating: reviewResult.summary.average, reviewCount: reviewResult.summary.count }} /> : null}
        </div>

        {reviewResult?.reviews?.length ? (
          <div className="review-list">
            {reviewResult.reviews.map(review => (
              <article className="review" key={review._id}>
                <div>
                  <b>{review.customerName}</b>
                  <span className="stars">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                </div>
                <p>{review.comment}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty">No customer reviews for this snack yet.</div>
        )}

        {delivered && (
          <form className="review-form" onSubmit={e => { e.preventDefault(); reviewMutation.mutate(); }}>
            <h3>Share Your Feedback</h3>
            <label>
              Rating
              <select value={rating} onChange={e => setRating(Number(e.target.value))}>
                {[5, 4, 3, 2, 1].map(v => <option key={v} value={v}>{v} Star{v > 1 && 's'}</option>)}
              </select>
            </label>
            <label>
              Your Review
              <textarea required minLength="3" value={comment} onChange={e => setComment(e.target.value)} placeholder="How was your snack?" />
            </label>
            <button className="button">Submit Review</button>
          </form>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Cart Page                                                          */
/* ------------------------------------------------------------------ */
function CartPage({ onOpenCare }) {
  const { items, change } = useCart();
  const lineTotal = item => item.price * item.quantity * (item.weightGrams ? item.weightGrams / 1000 : 1);
  const weightLabel = item => item.weightGrams ? (item.weightGrams >= 1000 ? item.weightGrams / 1000 + ' kg' : item.weightGrams + ' g') + ' each' : '';
  const total = items.reduce((sum, item) => sum + lineTotal(item), 0);

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data.settings)
  });

  return (
    <section className="section narrow">
      <p className="eyebrow">Your Selection</p>
      <h1>Cart</h1>
      {!items.length ? (
        <div className="empty">
          Your cart is currently empty.<br /><br />
          <Link to="/menu" className="button small" style={{ background: '#276044', color: '#fff' }}>Browse Our Snacks</Link>
        </div>
      ) : (
        <>
          <div className="cart-list">
            {items.map(item => (
              <div className="cart-item" key={item.cartKey || item._id}>
                <div className="mini-image">
                  {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : item.name[0]}
                </div>
                <div>
                  <h3>{item.name}</h3>
                  <p>{format(item.price)} per {item.unit || 'piece'}{weightLabel(item) ? ' · ' + weightLabel(item) : ''}</p>
                  {item.weightGrams && <p className="cart-weight-total">{format(lineTotal(item))} for this selection</p>}
                </div>
                <div className="quantity">
                  <button onClick={() => change(item.cartKey || item._id, item.quantity - 1)}><Minus size={15} /></button>
                  <b>{item.quantity}</b>
                  <button onClick={() => change(item.cartKey || item._id, item.quantity + 1)}><Plus size={15} /></button>
                </div>
              </div>
            ))}
          </div>

          <div className="summary">
            <div>
              <span>Total Order Amount</span>
              <strong>{format(total)}</strong>
            </div>
            <p className="instant-checkout" style={{ margin: '12px 0 16px' }}>
              Fast order confirmation — Our team will contact you within 10–15 minutes to confirm details. Zero advance payment required!
            </p>
            <Link className="button full" to="/checkout">Proceed to Checkout</Link>
          </div>

          <div className="pickup-info-banner">
            <MapPin size={20} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <h4>Store Pickup Address</h4>
              <p>{settings?.storeAddress || "Reddy's Home Foods, Main Road, Gourmet Plaza, Suite 10"}</p>
              <button type="button" className="text-btn" onClick={onOpenCare} style={{ fontSize: '12px', padding: 0, color: '#15803d' }}>
                Need help? Contact Customer Care
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Checkout Page                                                      */
/* ------------------------------------------------------------------ */
function Checkout({ onOpenCare, onOrderSuccess }) {
  const { user, setUser } = useAuth();
  const { items, clear } = useCart();
  const nav = useNavigate();
  const [fulfilment, setFulfilment] = useState('pickup');
  const [phone, setPhone] = useState(user?.phone || '');
  const [addressId, setAddressId] = useState(user?.addresses?.find(a => a.isDefault)?._id || '');
  const [error, setError] = useState('');

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data.settings)
  });

  const total = items.reduce((sum, item) => sum + item.price * item.quantity * (item.weightGrams ? item.weightGrams / 1000 : 1), 0);

  const orderMutation = useMutation({
    mutationFn: () => {
      let deliveryAddress = '';
      let latitude = undefined;
      let longitude = undefined;
      if (fulfilment === 'delivery') {
        const address = user?.addresses?.find(item => item._id === addressId);
        if (!address) throw new Error('Please select a saved delivery address or add a new one in profile.');
        deliveryAddress = `${address.label}: ${address.line}, ${address.city} - ${address.pincode}`;
        latitude = address.latitude;
        longitude = address.longitude;
      }
      return api.post('/orders', {
        phone,
        fulfilment,
        deliveryAddress,
        latitude,
        longitude,
        items: items.map(item => ({ snackId: item._id, quantity: item.quantity, ...(item.weightGrams ? { weightGrams: item.weightGrams } : {}) }))
      });
    },
    onSuccess: response => {
      const createdOrder = response.data.order;
      clear();
      onOrderSuccess(createdOrder);
    },
    onError: err => setError(err.response?.data?.message || err.message || 'Could not place order request.')
  });

  if (!user) return <Navigate to="/login" />;
  if (!items.length) return <Navigate to="/cart" />;

  return (
    <section className="section narrow">
      <p className="eyebrow">Final Step</p>
      <h1>Send Order Request</h1>
      <p className="muted">No advance payment required. We will call/WhatsApp you within 10–15 minutes to confirm details.</p>

      <form className="checkout" onSubmit={e => { e.preventDefault(); orderMutation.mutate(); }}>
        {error && <p className="error">{error}</p>}
        <label>
          Contact Phone Number
          <input required minLength="7" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. +91 9876543210" />
        </label>

        <label>
          Fulfilment Option
          <select value={fulfilment} onChange={e => setFulfilment(e.target.value)}>
            <option value="pickup">Store Pickup</option>
            <option value="delivery">Home Delivery</option>
          </select>
        </label>

        {fulfilment === 'pickup' && (
          <div className="pickup-info-banner">
            <MapPin size={22} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <h4>Store Pickup Address</h4>
              <p><strong>{settings?.storeAddress || "Reddy's Home Foods, Main Road, Gourmet Plaza, Suite 10"}</strong></p>
              <p style={{ fontSize: '12px', color: '#15803d', margin: '4px 0 0' }}>Store Phone: {settings?.storePhone || '+91 98765 43210'}</p>
            </div>
          </div>
        )}

        {fulfilment === 'delivery' && (
          <div className="address-picker">
            <b>Select Delivery Address</b>
            {user.addresses?.length ? (
              user.addresses.map(a => (
                <label className="saved-address" key={a._id}>
                  <input type="radio" name="address" required checked={addressId === a._id} onChange={() => setAddressId(a._id)} />
                  <span>
                    <b>{a.label}{a.isDefault ? ' (Default)' : ''}</b><br />
                    {a.line}, {a.city} - {a.pincode}
                  </span>
                </label>
              ))
            ) : (
              <p className="muted">No saved delivery address found.</p>
            )}
            <Link className="text-btn" to="/profile?return=checkout">+ Add standard address in profile</Link>
          </div>
        )}

        <div className="callout">
          <Phone size={20} />
          <div>
            <b>We will call to confirm within 10–15 mins</b>
            <p>Total amount: <strong>{format(total)}</strong>. Full payment confirmed over WhatsApp/Call or upon pickup/delivery.</p>
          </div>
        </div>

        <button className="button full" disabled={orderMutation.isPending}>
          {orderMutation.isPending ? 'Sending request...' : 'Send Order Request'}
        </button>

        <button type="button" className="text-btn center" onClick={onOpenCare} style={{ marginTop: 8 }}>
          <Headphones size={15} style={{ marginRight: 4 }} /> Questions? Contact Customer Care
        </button>
      </form>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Order Cards & Pagination Helpers                                    */
/* ------------------------------------------------------------------ */
function PaginationBar({ currentPage, totalItems, itemsPerPage, onPageChange }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="pagination-bar">
      <span className="page-info">Showing {start}–{end} of {totalItems} orders</span>
      <div className="page-controls">
        <button className="page-btn" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>
          <ChevronLeft size={16} /> Previous
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <button key={p} className={`page-btn ${p === currentPage ? 'active' : ''}`} onClick={() => onPageChange(p)}>
            {p}
          </button>
        ))}
        <button className="page-btn" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function OrderCard({ order, admin = false }) {
  const [status, setStatus] = useState(order.status);
  const qc = useQueryClient();

  const update = useMutation({
    mutationFn: next => api.patch(`/orders/admin/${order._id}/status`, { status: next }),
    onSuccess: result => {
      setStatus(result.data.order.status);
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  const whatsappText = `Hello ${order.customerName},\n\n*Reddy's Home Foods - Order #${order._id.slice(-6).toUpperCase()}*\n${order.items.map(i => `• ${i.name} × ${i.quantity}`).join('\n')}\n\n*Total Amount:* ${format(order.totalAmount)}\n*Fulfilment:* ${order.fulfilment === 'delivery' ? 'Delivery' : 'Pickup'}\n\nWe are contacting you to confirm your fresh order.`;
  const whatsappUrl = `https://wa.me/${order.customerPhone?.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappText)}`;
  const cleanMapsUrl = (order.latitude && order.longitude)
    ? `https://www.google.com/maps/search/?api=1&query=${order.latitude},${order.longitude}`
    : order.deliveryAddress
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress.replace(/^[^:]+:\s*/, '').trim())}`
      : null;

  return (
    <article className="order-card friendly-order">
      <div className="order-top">
        <div>
          <p className="category">ORDER #{order._id.slice(-6).toUpperCase()}</p>
          <h3>{statusLabels[status] || status}</h3>
          <p className="muted">{new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
        </div>
        <span className="status">{statusLabels[status] || status}</span>
      </div>

      {admin && (
        <div className="customer-contact">
          <div>
            <b>{order.customerName || 'Customer'}</b>
            <span>{order.customerPhone || 'No phone'}</span>
          </div>
          <div>
            <span>{order.customerEmail}</span>
            <span>{order.fulfilment === 'delivery' ? `Delivery: ${order.deliveryAddress}` : 'Store Pickup'}</span>
          </div>
        </div>
      )}

      <p className="order-items">{order.items.map(i => `${i.name} × ${i.quantity}`).join(', ')}</p>

      <div className="order-bottom">
        <span>{order.fulfilment === 'delivery' ? <><MapPin size={15} /> Delivery</> : 'Store Pickup'} · Total: <strong>{format(order.totalAmount)}</strong></span>

        {admin ? (
          <div className="admin-actions">
            <a className="whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={17} /> WhatsApp</a>
            <a className="call" href={`tel:${order.customerPhone}`}><Phone size={16} /> Call</a>
            {order.fulfilment === 'delivery' && cleanMapsUrl && (
              <a className="call" href={cleanMapsUrl} target="_blank" rel="noreferrer" style={{ background: '#3b82f6', color: '#fff' }}>
                <MapPin size={15} /> Open Maps
              </a>
            )}
            <select value={status} disabled={update.isPending} onChange={e => update.mutate(e.target.value)}>
              {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function Orders() {
  const { user } = useAuth();
  const [tab, setTab] = useState('active');
  const [page, setPage] = useState(1);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get('/orders/my-orders').then(r => r.data.orders),
    enabled: !!user
  });

  if (!user) return <Navigate to="/login" />;

  const isCompleted = status => status === 'delivered' || status === 'cancelled';
  const activeOrders = orders.filter(o => !isCompleted(o.status));
  const pastOrders = orders.filter(o => isCompleted(o.status));

  const list = tab === 'active' ? activeOrders : pastOrders;
  const paginated = list.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <section className="section narrow">
      <p className="eyebrow">Your History</p>
      <h1>My Orders</h1>

      <div className="order-tab-bar">
        <button type="button" className={`tab-btn ${tab === 'active' ? 'active' : ''}`} onClick={() => { setTab('active'); setPage(1); }}>
          Active Orders <span className="badge-count">{activeOrders.length}</span>
        </button>
        <button type="button" className={`tab-btn ${tab === 'past' ? 'active' : ''}`} onClick={() => { setTab('past'); setPage(1); }}>
          Past Order History <span className="badge-count">{pastOrders.length}</span>
        </button>
      </div>

      {isLoading ? (
        <p>Loading orders...</p>
      ) : !list.length ? (
        <div className="empty">No {tab === 'active' ? 'active order requests' : 'past orders'} found.</div>
      ) : (
        <>
          <div className="order-list">
            {paginated.map(order => <OrderCard key={order._id} order={order} />)}
          </div>
          <PaginationBar currentPage={page} totalItems={list.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={p => setPage(p)} />
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Admin Order Desk & Redesigned Store Profile Settings               */
/* ------------------------------------------------------------------ */
function EnhancedOrderDesk() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('active');
  const [subStatus, setSubStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState('');

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data.settings),
    enabled: user?.role === 'admin'
  });

  const [storeForm, setStoreForm] = useState(null);

  useEffect(() => {
    if (settingsData) {
      setStoreForm({
        storeAddress: settingsData.storeAddress || '',
        storePhone: settingsData.storePhone || '',
        storeEmail: settingsData.storeEmail || '',
        customerCareNotice: settingsData.customerCareNotice || '',
        instantStartTime: settingsData.instantStartTime || '09:00',
        instantEndTime: settingsData.instantEndTime || '20:00'
      });
    }
  }, [settingsData]);

  const updateSettings = useMutation({
    mutationFn: values => api.patch('/settings', values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      setNotice("Reddy's Home Foods store profile & address settings updated successfully!");
      setTimeout(() => setNotice(''), 3500);
    }
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders', search],
    queryFn: () => api.get('/orders/admin', { params: { search } }).then(r => r.data.orders),
    enabled: user?.role === 'admin'
  });

  if (user?.role !== 'admin') return <Navigate to="/" />;

  const activeList = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
  const deliveredList = orders.filter(o => o.status === 'delivered');
  const cancelledList = orders.filter(o => o.status === 'cancelled');

  let currentList = orders;
  if (tab === 'active') currentList = activeList;
  else if (tab === 'delivered') currentList = deliveredList;
  else if (tab === 'cancelled') currentList = cancelledList;

  if (subStatus !== 'all') {
    currentList = currentList.filter(o => o.status === subStatus);
  }

  const paginatedOrders = currentList.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <section className="section">
      <div className="section-title">
        <div>
          <p className="eyebrow">Reddy's Home Foods Admin</p>
          <h1>Order Desk & Store Profile</h1>
        </div>
      </div>

      {storeForm && (
        <form className="settings-section-card" onSubmit={e => { e.preventDefault(); updateSettings.mutate(storeForm); }}>
          <div className="settings-header">
            <div className="settings-header-icon">
              <MapPin size={24} />
            </div>
            <div>
              <h2>Store Profile & Pickup Address Settings</h2>
              <p>Manage pickup address, customer support contact numbers, and instant order timings shown to users.</p>
            </div>
          </div>

          {notice && <p className="success-note" style={{ margin: 0 }}>{notice}</p>}

          <div className="settings-form-grid">
            <div className="form-field-card full-width">
              <label><MapPin size={14} /> Store Pickup Address (Visible to Customers)</label>
              <textarea required rows={2} value={storeForm.storeAddress} onChange={e => setStoreForm({ ...storeForm, storeAddress: e.target.value })} placeholder="Reddy's Home Foods, Main Road..." />
            </div>

            <div className="form-field-card">
              <label><Phone size={14} /> Support Phone (Calls & WhatsApp)</label>
              <input required value={storeForm.storePhone} onChange={e => setStoreForm({ ...storeForm, storePhone: e.target.value })} placeholder="+91 98765 43210" />
            </div>

            <div className="form-field-card">
              <label><Mail size={14} /> Support Email Address</label>
              <input required type="email" value={storeForm.storeEmail} onChange={e => setStoreForm({ ...storeForm, storeEmail: e.target.value })} placeholder="support@reddyshomefoods.com" />
            </div>

            <div className="form-field-card full-width">
              <label><Headphones size={14} /> Customer Support Notice Text</label>
              <input value={storeForm.customerCareNotice} onChange={e => setStoreForm({ ...storeForm, customerCareNotice: e.target.value })} placeholder="Available Mon-Sat 9 AM - 9 PM..." />
            </div>

            <div className="form-field-card">
              <label><Clock size={14} /> Instant Orders Start Time</label>
              <input type="time" value={storeForm.instantStartTime} onChange={e => setStoreForm({ ...storeForm, instantStartTime: e.target.value })} />
            </div>

            <div className="form-field-card">
              <label><Clock size={14} /> Instant Orders End Time</label>
              <input type="time" value={storeForm.instantEndTime} onChange={e => setStoreForm({ ...storeForm, instantEndTime: e.target.value })} />
            </div>
          </div>

          <button className="button" disabled={updateSettings.isPending} style={{ width: 'max-content', padding: '12px 24px' }}>
            {updateSettings.isPending ? 'Saving...' : "Save Reddy's Home Foods Settings"}
          </button>
        </form>
      )}

      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: '24px', margin: '0 0 12px', fontFamily: "'Outfit', sans-serif" }}>Customer Orders Desk</h2>

        <div className="order-tab-bar">
          <button type="button" className={`tab-btn ${tab === 'active' ? 'active' : ''}`} onClick={() => { setTab('active'); setPage(1); }}>
            Active Orders <span className="badge-count">{activeList.length}</span>
          </button>
          <button type="button" className={`tab-btn ${tab === 'delivered' ? 'active' : ''}`} onClick={() => { setTab('delivered'); setPage(1); }}>
            Delivered History <span className="badge-count">{deliveredList.length}</span>
          </button>
          <button type="button" className={`tab-btn ${tab === 'cancelled' ? 'active' : ''}`} onClick={() => { setTab('cancelled'); setPage(1); }}>
            Cancelled Orders <span className="badge-count">{cancelledList.length}</span>
          </button>
          <button type="button" className={`tab-btn ${tab === 'all' ? 'active' : ''}`} onClick={() => { setTab('all'); setPage(1); }}>
            All Orders <span className="badge-count">{orders.length}</span>
          </button>
        </div>

        <div className="filters order-filters">
          <label style={{ flex: 2 }}><Search size={17} /><input placeholder="Search Order ID, customer name or phone..." value={search} onChange={e => setSearch(e.target.value)} /></label>
          <label>
            <Filter size={17} />
            <select value={subStatus} onChange={e => { setSubStatus(e.target.value); setPage(1); }}>
              <option value="all">All Specific Statuses</option>
              {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        </div>

        {isLoading ? (
          <p>Loading order desk...</p>
        ) : !currentList.length ? (
          <div className="empty">No matching orders in this category.</div>
        ) : (
          <>
            <div className="order-list">
              {paginatedOrders.map(order => <OrderCard key={order._id} admin order={order} />)}
            </div>
            <PaginationBar currentPage={page} totalItems={currentList.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={p => setPage(p)} />
          </>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Admin Menu Manager                                                 */
/* ------------------------------------------------------------------ */
function EnhancedMenuManager() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const emptySnack = {
    name: '',
    description: '',
    category: 'Snacks',
    price: '',
    unit: 'piece',
    minimumPreparationDays: '1',
    maximumPreparationDays: '2',
    preparationType: 'made_to_order',
    availableQuantity: 99,
    pickupAvailable: true,
    deliveryAvailable: true,
    isFavorite: false,
    isPopular: false,
    imageUrls: []
  };

  const [form, setForm] = useState(emptySnack);
  const [editingId, setEditingId] = useState(null);
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState('');
  const [categoryForm, setCategoryForm] = useState({ name: '', imageUrl: '' });
  const [categoryFile, setCategoryFile] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState(null);

  const { data: snacks = [] } = useQuery({
    queryKey: ['admin-snacks'],
    queryFn: () => api.get('/snacks?includeInactive=true').then(r => r.data.snacks),
    enabled: user?.role === 'admin'
  });
  const { data: adminCategories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => api.get('/categories/admin').then(r => r.data.categories),
    enabled: user?.role === 'admin'
  });
  const { data: categoryOptions = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data.categories),
    enabled: user?.role === 'admin'
  });

  const uploadMutation = useMutation({
    mutationFn: () => {
      const body = new FormData();
      files.forEach(file => body.append('images', file));
      return api.post('/uploads/image', body);
    },
    onSuccess: r => {
      setForm(prev => ({
        ...prev,
        imageUrls: [...prev.imageUrls, ...r.data.imageUrls].slice(0, 6)
      }));
      setFiles([]);
      setMessage('✅ Images uploaded to Cloudinary successfully!');
    },
    onError: e => setMessage(`❌ ${e.response?.data?.message || 'Image upload failed.'}`)
  });

  const saveMutation = useMutation({
    mutationFn: values => {
      const minDays = Number(values.minimumPreparationDays || 1);
      const maxDays = Number(values.maximumPreparationDays || minDays);
      const payload = {
        ...values,
        price: Number(values.price),
        advanceAmount: 0,
        minimumPreparationDays: values.preparationType === 'instant' ? 0 : minDays,
        maximumPreparationDays: values.preparationType === 'instant' ? 0 : Math.max(minDays, maxDays),
        imageUrl: values.imageUrls[0] || ''
      };
      return editingId ? api.patch(`/snacks/${editingId}`, payload) : api.post('/snacks', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-snacks'] });
      qc.invalidateQueries({ queryKey: ['snacks'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
      setForm(emptySnack);
      setEditingId(null);
      setMessage('✅ Snack saved to menu!');
    },
    onError: e => setMessage(`❌ ${e.response?.data?.message || 'Could not save snack.'}`)
  });

  const deleteSnackMutation = useMutation({
    mutationFn: id => api.delete(`/snacks/${id}?hard=true`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-snacks'] });
      qc.invalidateQueries({ queryKey: ['snacks'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
      setForm(emptySnack);
      setEditingId(null);
      setMessage('🗑️ Snack permanently deleted from menu database.');
    },
    onError: e => setMessage(`❌ ${e.response?.data?.message || 'Could not delete snack.'}`)
  });

  const toggleActive = useMutation({
    mutationFn: snack => api.patch(`/snacks/${snack._id}`, { active: !snack.active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-snacks'] });
      qc.invalidateQueries({ queryKey: ['snacks'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
    }
  });

  const saveCategoryMutation = useMutation({
    mutationFn: async () => {
      let imageUrl = categoryForm.imageUrl;
      if (categoryFile) {
        const uploadBody = new FormData();
        uploadBody.append('images', categoryFile);
        const uploaded = await api.post('/uploads/image', uploadBody);
        imageUrl = uploaded.data.imageUrls[0];
      }
      const payload = { ...categoryForm, imageUrl };
      return editingCategoryId ? api.patch(`/categories/${editingCategoryId}`, payload) : api.post('/categories', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
      setCategoryForm({ name: '', imageUrl: '' });
      setCategoryFile(null);
      setEditingCategoryId(null);
      setMessage('✅ Category saved. It is now available in the snack category dropdown.');
    },
    onError: e => setMessage(`❌ ${e.response?.data?.message || 'Could not save category.'}`)
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: category => category.derived
      ? api.post('/categories', { name: category.name, imageUrl: '', active: false })
      : api.patch(`/categories/${category._id}`, { active: !category.active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
      setMessage('Category image entry removed. Existing snacks are unchanged.');
    }
  });

  const startCategoryEdit = category => {
    setEditingCategoryId(category.derived ? null : category._id);
    setCategoryForm({ name: category.name, imageUrl: category.imageUrl || '' });
    setCategoryFile(null);
  };

  if (user?.role !== 'admin') return <Navigate to="/" />;

  const startEdit = snack => {
    setEditingId(snack._id);
    setForm({
      ...emptySnack,
      ...snack,
      minimumPreparationDays: snack.minimumPreparationDays || '1',
      maximumPreparationDays: snack.maximumPreparationDays || snack.minimumPreparationDays || '2',
      imageUrls: snack.imageUrls?.length ? snack.imageUrls : snack.imageUrl ? [snack.imageUrl] : []
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeSingleImage = indexToRemove => {
    setForm(prev => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  return (
    <section className="section admin-manager">
      <div className="section-title">
        <div>
          <p className="eyebrow">Reddy's Home Foods Catalogue</p>
          <h1>Menu Manager</h1>
        </div>
        <p className="muted">Create snacks, upload photos via Cloudinary, remove photos, edit, or delete items permanently.</p>
      </div>

      <div className="manager-stack">
        <form className="snack-editor" onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }}>
          <h2>{editingId ? 'Edit Snack' : 'Create New Snack'}</h2>
          {message && <p className={message.includes('❌') ? 'error' : 'success-note'}>{message}</p>}

          <div className="image-editor">
            <b style={{ fontSize: '13px' }}>Upload Cloudinary Product Photos</b>
            <div className="image-preview-grid">
              {form.imageUrls.length ? (
                form.imageUrls.map((url, i) => (
                  <div key={`${url}-${i}`} style={{ position: 'relative' }}>
                    <img src={url} alt="Snack preview" />
                    <button type="button" title="Remove this photo" onClick={() => removeSingleImage(i)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(239,68,68,0.9)', color: '#fff', border: 0, borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>×</button>
                  </div>
                ))
              ) : (
                <div className="image-empty">Select files below to upload Cloudinary images</div>
              )}
            </div>

            <input type="file" multiple accept="image/*" onChange={e => setFiles([...e.target.files].slice(0, 6 - form.imageUrls.length))} />
            <button type="button" className="button small" disabled={!files.length || uploadMutation.isPending} onClick={() => uploadMutation.mutate()}>
              <Upload size={14} style={{ marginRight: 5 }} /> {uploadMutation.isPending ? 'Uploading to Cloudinary...' : 'Upload Selected Images'}
            </button>
            <label style={{ fontSize: '12px', color: '#64748b' }}>
              Or paste image URL manually:
              <input placeholder="https://res.cloudinary.com/..." onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (e.target.value.trim()) {
                    setForm({ ...form, imageUrls: [...form.imageUrls, e.target.value.trim()].slice(0, 6) });
                    e.target.value = '';
                  }
                }
              }} />
            </label>
          </div>

          <label>
            Snack Name
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Handmade Samosa" />
          </label>

          <label>
            Description
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Fresh ingredients, traditional recipe..." />
          </label>

          <div className="editor-grid">
            <label>
              Category
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {categoryOptions.map(category => <option key={category._id} value={category.name}>{category.name}</option>)}
              </select>
            </label>
            <label>
              Full Price (₹)
              <input required type="number" min="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
            </label>
            <label>
              Price Unit
              <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                <option value="piece">Per Piece</option>
                <option value="kg">Per kg</option>
                <option value="litre">Per litre</option>
              </select>
            </label>
            <label>
              Stock Limit
              <input type="number" min="0" value={form.availableQuantity} onChange={e => setForm({ ...form, availableQuantity: Number(e.target.value) })} />
            </label>
            <label>
              Preparation Type
              <select value={form.preparationType} onChange={e => setForm({ ...form, preparationType: e.target.value })}>
                <option value="made_to_order">Made to order</option>
                <option value="instant">Available now</option>
              </select>
            </label>
            {form.preparationType !== 'instant' && (
              <>
                <label>
                  Min Prep Days
                  <input type="number" min="0" value={form.minimumPreparationDays} onChange={e => setForm({ ...form, minimumPreparationDays: e.target.value, maximumPreparationDays: Math.max(Number(e.target.value), Number(form.maximumPreparationDays || e.target.value)) })} />
                </label>
                <label>
                  Max Prep Days
                  <input type="number" min="0" value={form.maximumPreparationDays} onChange={e => setForm({ ...form, maximumPreparationDays: e.target.value })} />
                </label>
              </>
            )}
          </div>

          <div className="checks" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', margin: '8px 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={form.pickupAvailable} onChange={e => setForm({ ...form, pickupAvailable: e.target.checked })} /> Pickup
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={form.deliveryAvailable} onChange={e => setForm({ ...form, deliveryAvailable: e.target.checked })} /> Delivery
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#d97706', fontWeight: 'bold' }}>
              <input type="checkbox" checked={form.isFavorite} onChange={e => setForm({ ...form, isFavorite: e.target.checked, isPopular: e.target.checked })} /> ⭐ Mark as Popular (Featured Selections)
            </label>
          </div>

          <button className="button full" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : editingId ? 'Save Changes' : 'Add Snack to Menu'}
          </button>

          {editingId && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', marginTop: 6 }}>
              <button type="button" className="text-btn" onClick={() => { setEditingId(null); setForm(emptySnack); }}>
                Cancel Edit
              </button>
              <button type="button" className="button small" style={{ background: '#ef4444' }} onClick={() => {
                if (window.confirm(`Are you sure you want to permanently delete "${form.name}" from your database?`)) {
                  deleteSnackMutation.mutate(editingId);
                }
              }}>
                <Trash2 size={14} style={{ marginRight: 4 }} /> Delete Snack Permanently
              </button>
            </div>
          )}
        </form>

        <section className="category-manager">
          <div>
            <p className="eyebrow">Browse page</p>
            <h2>Category images</h2>
            <p className="muted">Add each category once, then use its exact name on snacks. Its image will appear in Browse Snacks.</p>
          </div>
          <div className="category-editor">
            <label>Category name
              <input value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="e.g. Pickles" />
            </label>
            <label>Category image <span className="category-upload-hint">Uploads to Cloudinary when you save</span>
              <input type="file" accept="image/*" onChange={e => setCategoryFile(e.target.files?.[0] || null)} />
            </label>
            <label>Or image URL
              <input value={categoryForm.imageUrl} onChange={e => setCategoryForm({ ...categoryForm, imageUrl: e.target.value })} placeholder="https://..." />
            </label>
            <button type="button" className="button" disabled={!categoryForm.name.trim() || saveCategoryMutation.isPending} onClick={() => saveCategoryMutation.mutate()}>
              {saveCategoryMutation.isPending ? 'Uploading & saving...' : editingCategoryId ? 'Save category changes' : 'Save category'}
            </button>
            {editingCategoryId && <button type="button" className="text-btn" onClick={() => { setEditingCategoryId(null); setCategoryForm({ name: '', imageUrl: '' }); setCategoryFile(null); }}>Cancel edit</button>}
          </div>
          {adminCategories.length > 0 && <div className="admin-category-grid">
            {adminCategories.map(category => <article key={category._id}>
              <img src={category.imageUrl || DEFAULT_CATEGORY_IMAGE} alt="" />
              <div><b>{category.name}</b><span>{category.derived ? 'Default category' : category.active ? 'Category image' : 'Hidden from customers'}</span></div>
              <div className="category-card-actions">
                <button type="button" className="text-btn" onClick={() => startCategoryEdit(category)}>Edit</button>
                <button type="button" className="text-btn" style={{ color: category.active ? '#dc2626' : '#166534' }} onClick={() => { if (window.confirm((category.active ? 'Hide ' : 'Restore ') + 'category ' + category.name + '? Snacks will not be deleted.')) deleteCategoryMutation.mutate(category); }}>{category.active ? 'Delete' : 'Restore'}</button>
              </div>
            </article>)}
          </div>}
        </section>

        <div className="manager-list">
          <h2>Current Snacks ({snacks.length})</h2>
          <div className="manager-snack-grid">{snacks.map(s => (
            <article className={`manager-snack ${!s.active ? 'inactive' : ''}`} key={s._id}>
              <img src={s.imageUrl || s.imageUrls?.[0] || ''} alt="" />
              <div style={{ flex: 1 }}>
                <b>{s.name} {(s.isFavorite || s.isPopular) && '⭐ Popular'}</b>
                <p>{format(s.price)} / {s.unit || 'piece'} · Stock {s.availableQuantity}</p>
                <small>{s.active ? 'Visible to customers' : 'Hidden'} · {formatPrepTime(s)}</small>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button type="button" className="text-btn" onClick={() => startEdit(s)}>Edit</button>
                <button type="button" className="text-btn" onClick={() => toggleActive.mutate(s)}>{s.active ? 'Hide' : 'Show'}</button>
                <button type="button" className="text-btn" style={{ color: '#ef4444' }} onClick={() => {
                  if (window.confirm(`Permanently delete "${s.name}"?`)) {
                    deleteSnackMutation.mutate(s._id);
                  }
                }}>Delete</button>
              </div>
            </article>
          ))}</div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Profile & Address Management                                       */
/* ------------------------------------------------------------------ */
function Profile() {
  const { user, setUser } = useAuth();
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState({ label: 'Home', line: '', city: '', pincode: '', isDefault: true });
  const [notice, setNotice] = useState('');

  const saveProfile = useMutation({
    mutationFn: () => api.patch('/auth/profile', { phone }),
    onSuccess: r => { setUser(r.data.user); setNotice('Profile saved.'); }
  });

  const saveAddress = useMutation({
    mutationFn: () => api.post('/auth/addresses', address),
    onSuccess: r => {
      setUser(r.data.user);
      setAddress({ label: 'Home', line: '', city: '', pincode: '', isDefault: false });
      setNotice('Address saved successfully!');
    }
  });

  const [locating, setLocating] = useState(false);

  const handleAutoDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
          const data = await res.json();
          const addr = data.address || {};
          const road = addr.road || addr.suburb || addr.neighbourhood || addr.residential || '';
          const house = addr.house_number || addr.building || '';
          const lineStr = [house, road, addr.suburb, addr.city_district].filter(Boolean).join(', ') || data.display_name?.split(',').slice(0, 3).join(',') || `GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
          const cityStr = addr.city || addr.town || addr.village || addr.county || addr.state_district || 'Hyderabad';
          const pinStr = addr.postcode || '500001';

          setAddress(prev => ({
            ...prev,
            line: lineStr,
            city: cityStr,
            pincode: pinStr,
            latitude: lat,
            longitude: lng
          }));
          setNotice('📍 Current location auto-detected! Address fields populated.');
          setTimeout(() => setNotice(''), 4000);
        } catch (err) {
          setAddress(prev => ({ ...prev, latitude: lat, longitude: lng }));
          setNotice('📍 GPS coordinates captured! Enter street details to save.');
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        alert("Could not detect location. Please enable location permissions in your browser.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const removeAddress = useMutation({
    mutationFn: id => api.delete(`/auth/addresses/${id}`),
    onSuccess: () => api.get('/auth/me').then(r => setUser(r.data.user))
  });

  if (!user) return <Navigate to="/login" />;

  const initials = (user.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <section className="section profile-page">
      <p className="eyebrow">Reddy's Home Foods Account</p>
      <h1>My Account Profile</h1>
      {notice && <p className="success-note">{notice}</p>}

      <div className="profile-header-card">
        <div className="profile-avatar">{initials}</div>
        <div className="profile-user-info">
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <span className="role-tag">{user.role === 'admin' ? 'Store Administrator' : 'Valued Customer'}</span>
        </div>
      </div>

      <div className="profile-grid-hub">
        <form className="profile-card" onSubmit={e => { e.preventDefault(); saveProfile.mutate(); }}>
          <h3><Phone size={18} style={{ color: '#16a34a' }} /> Contact Details</h3>
          <div className="form-field-card">
            <label>Full Name</label>
            <input value={user.name} disabled style={{ background: '#f1f5f9', color: '#64748b' }} />
          </div>
          <div className="form-field-card">
            <label>Email Address</label>
            <input value={user.email} disabled style={{ background: '#f1f5f9', color: '#64748b' }} />
          </div>
          <div className="form-field-card">
            <label>Phone Number (WhatsApp & Call)</label>
            <input required minLength="7" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 9876543210" />
          </div>
          <button className="button full" disabled={saveProfile.isPending}>
            {saveProfile.isPending ? 'Saving...' : 'Save Profile Details'}
          </button>
        </form>

        <div className="profile-card">
          <h3><MapPin size={18} style={{ color: '#16a34a' }} /> Saved Delivery Addresses</h3>
          {user.addresses?.length ? (
            <div className="address-list-wrap">
              {user.addresses.map(item => (
                <div className="address-card-item" key={item._id}>
                  <div className="address-details">
                    <b>{item.label}{item.isDefault && <span className="badge-default">Default</span>}</b>
                    <p>{item.line}, {item.city} - {item.pincode}</p>
                    {item.latitude && item.longitude && (
                      <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: 600 }}>📍 GPS Pin Attached</span>
                    )}
                  </div>
                  <button className="text-btn" type="button" onClick={() => removeAddress.mutate(item._id)} style={{ color: '#ef4444', flexShrink: 0, padding: 0 }}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No saved delivery addresses yet. Add your standard address below for faster checkout.</p>
          )}
        </div>
      </div>

      <form className="profile-card" onSubmit={e => { e.preventDefault(); saveAddress.mutate(); }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <h3><Plus size={18} style={{ color: '#16a34a' }} /> Add New Delivery Address</h3>
          <button type="button" className="button small" disabled={locating} onClick={handleAutoDetectLocation} style={{ background: '#0284c7', border: 0 }}>
            <MapPin size={15} style={{ marginRight: 4 }} /> {locating ? 'Detecting GPS Location...' : 'Use My Current Location'}
          </button>
        </div>

        <div className="settings-form-grid" style={{ marginTop: 12 }}>
          <div className="form-field-card">
            <label>Address Label (e.g. Home, Office, Parents)</label>
            <input required placeholder="Home, Office, Work..." value={address.label} onChange={e => setAddress({ ...address, label: e.target.value })} />
          </div>
          <div className="form-field-card">
            <label>City</label>
            <input required placeholder="Hyderabad, Bengaluru..." value={address.city} onChange={e => setAddress({ ...address, city: e.target.value })} />
          </div>
          <div className="form-field-card full-width">
            <label>Full Street Line Address (Flat / House No, Street, Landmark)</label>
            <textarea required rows={2} placeholder="Flat 402, Royal Enclave, Road No 10, Jubilee Hills" value={address.line} onChange={e => setAddress({ ...address, line: e.target.value })} />
          </div>
          <div className="form-field-card">
            <label>PIN Code</label>
            <input required placeholder="500033" value={address.pincode} onChange={e => setAddress({ ...address, pincode: e.target.value })} />
          </div>
          <div className="form-field-card" style={{ justifyContent: 'center' }}>
            <label className="check-row" style={{ textTransform: 'none', fontWeight: 600 }}>
              <input type="checkbox" checked={address.isDefault} onChange={e => setAddress({ ...address, isDefault: e.target.checked })} /> Set as default delivery address
            </label>
          </div>
        </div>
        <button className="button" disabled={saveAddress.isPending} style={{ width: 'max-content', padding: '12px 24px' }}>
          {saveAddress.isPending ? 'Saving Address...' : 'Save New Address'}
        </button>
      </form>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Login & Authentication Component                                    */
/* ------------------------------------------------------------------ */
function Login() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [register, setRegister] = useState(false);
  const [error, setError] = useState('');
  const nav = useNavigate();

  if (user) return <Navigate to="/" />;

  const submit = async e => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post(register ? '/auth/register' : '/auth/login', register ? form : { email: form.email, password: form.password });
      setUser(res.data.user);
      nav('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Please check your details and try again.');
    }
  };

  return (
    <div className="auth">
      <form onSubmit={submit}>
        <p className="eyebrow">Welcome</p>
        <h1>{register ? 'Create Your Account' : 'Welcome Back'}</h1>
        {error && <p className="error">{error}</p>}
        {register && <input placeholder="Your Full Name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />}
        <input type="email" placeholder="Email Address" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        <input type="password" placeholder="Password (minimum 8 characters)" required minLength="8" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
        <button className="button full">{register ? 'Create Account' : 'Log In'}</button>
        <a className="google" href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/google`}>
          Continue with Google
        </a>
        <button type="button" className="text-btn center" onClick={() => setRegister(!register)}>
          {register ? 'Already have an account? Log in' : "New to Reddy's Home Foods? Create an account"}
        </button>
      </form>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={new QueryClient()}>
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  </QueryClientProvider>
);
