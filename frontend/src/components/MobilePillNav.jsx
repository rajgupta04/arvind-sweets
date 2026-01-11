import React, { useContext, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiGrid, FiShoppingCart, FiPackage, FiUser } from 'react-icons/fi';
import { AuthContext } from '../context/AuthContext';
import { CartContext } from '../context/CartContext';

function isActivePath(pathname, target) {
  if (!target) return false;
  if (target === '/') return pathname === '/' || pathname === '/home';
  if (target === '/home') return pathname === '/' || pathname === '/home';
  return pathname === target || pathname.startsWith(`${target}/`);
}

export default function MobilePillNav() {
  const { pathname } = useLocation();
  const { user } = useContext(AuthContext);
  const { getCartItemsCount } = useContext(CartContext);

  const staffOrdersTarget = useMemo(() => {
    if (user?.role === 'delivery_boy') return '/delivery/my-packages';
    if (user?.role === 'admin') return '/admin/orders';
    return '/orders';
  }, [user?.role]);

  const ordersLabel = useMemo(() => {
    if (user?.role === 'delivery_boy' || user?.role === 'admin') return 'Track';
    return 'Orders';
  }, [user?.role]);

  const items = useMemo(() => {
    const base = [
      { to: '/home', label: 'Home', Icon: FiHome },
      { to: '/products', label: 'Products', Icon: FiGrid },
      { to: '/cart', label: 'Cart', Icon: FiShoppingCart, badge: getCartItemsCount() },
    ];

    if (user) {
      base.push({ to: staffOrdersTarget, label: ordersLabel, Icon: FiPackage });
      base.push({ to: '/profile', label: 'Profile', Icon: FiUser });
    } else {
      base.push({ to: '/login', label: 'Login', Icon: FiUser });
    }

    // Keep exactly 5 slots like the reference design.
    // If logged out, we still want 4 items; add Orders as a shortcut to login.
    if (!user) {
      base.push({ to: '/orders', label: 'Orders', Icon: FiPackage });
    }

    return base.slice(0, 5);
  }, [getCartItemsCount, ordersLabel, staffOrdersTarget, user]);

  return (
    <nav
      className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
      aria-label="Mobile navigation"
    >
      <div className="pill-fire-border bg-white/95 backdrop-blur border border-gray-200 shadow-lg rounded-full px-3 py-2">
        <div className="relative z-10 flex items-center gap-2">
          {items.map(({ to, label, Icon, badge }) => {
            const active = isActivePath(pathname, to);
            return (
              <Link
                key={to}
                to={to}
                aria-label={label}
                className={
                  "relative flex items-center justify-center w-12 h-10 rounded-full transition " +
                  (active ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-800')
                }
              >
                <Icon className="w-5 h-5" />
                {active ? (
                  <span className="absolute -bottom-1 w-6 h-1 rounded-full bg-orange-600" />
                ) : null}
                {typeof badge === 'number' && badge > 0 ? (
                  <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] leading-none rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                    {badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
