// Navbar component
import React from 'react';
import { Link } from 'react-router-dom';
import { useContext } from 'react';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import { NotificationsContext } from '../context/NotificationsContext';
import { FiShoppingCart, FiUser, FiBell } from 'react-icons/fi';
import logo from '../components/arvindlogo.png';

function Navbar() {
  const { getCartItemsCount } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const { unreadCount } = useContext(NotificationsContext);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  // Close user menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuOpen && !event.target.closest('#user-menu-container')) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/home" className="flex items-center">
            <img
              src={logo}
              alt="Arvind Sweets Logo"
              className="h-[11.75rem] drop-shadow-[0_0_12px_rgba(255,165,0,0.4)] object-contain"
            />
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/home" className="text-gray-700 hover:text-orange-600 transition">Home</Link>
            <Link to="/products" className="text-gray-700 hover:text-orange-600 transition">Products</Link>
            <Link to="/contact" className="text-gray-700 hover:text-orange-600 transition">Contact</Link>
            {user && (
              <Link to="/orders" className="text-gray-700 hover:text-orange-600 transition">
                My Orders
              </Link>
            )}
            {user?.role === 'delivery_boy' && (
              <Link to="/delivery/my-packages" className="text-gray-700 hover:text-orange-600 transition">
                My Packages
              </Link>
            )}

            <Link to="/cart" className="relative">
              <FiShoppingCart className="w-6 h-6 text-gray-700 hover:text-orange-600" />
              {getCartItemsCount() > 0 && (
                <span className="absolute -top-2 -right-2 bg-orange-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {getCartItemsCount()}
                </span>
              )}
            </Link>

            <Link to="/notifications" className="relative" aria-label="Notifications">
              <FiBell className="w-6 h-6 text-gray-700 hover:text-orange-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-orange-600 text-white text-xs rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>

            {user ? (
              <Link to="/sweetcoin" className="relative" aria-label="SweetCoin">
                <span className="coin-glow">
                  <span className="text-lg leading-none">🪙</span>
                </span>
                {Math.max(0, Math.floor(Number(user?.sweetCoinBalance) || 0)) > 0 ? (
                  <span className="absolute -top-2 -right-2 bg-gray-900 text-white text-xs rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
                    {Math.max(0, Math.floor(Number(user?.sweetCoinBalance) || 0)) > 999
                      ? '999+'
                      : Math.max(0, Math.floor(Number(user?.sweetCoinBalance) || 0))}
                  </span>
                ) : null}
              </Link>
            ) : null}

            {/* User Menu */}
            {user ? (
              <div className="relative" id="user-menu-container">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 text-gray-700 hover:text-orange-600 transition"
                >
                  <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center">
                    <FiUser className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium">{user.name}</span>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50 border border-gray-200">
                    {user.role === 'admin' ? (
                      <Link
                        to="/admin/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                      >
                        Admin Profile
                      </Link>
                    ) : (
                      <Link
                        to="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                      >
                        My Profile
                      </Link>
                    )}
                    {user.role === 'admin' && (
                      <Link
                        to="/admin"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                      >
                        Admin Panel
                      </Link>
                    )}
                    <Link
                      to="/orders"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                    >
                      My Orders
                    </Link>

                    <Link
                      to="/sweetcoin"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                    >
                      🪙 SweetCoin
                    </Link>

                    {user.role === 'delivery_boy' && (
                      <Link
                        to="/delivery/my-packages"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                      >
                        My Packages
                      </Link>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="text-gray-700 hover:text-orange-600 transition">
                Login
              </Link>
            )}
          </div>

          {/* Mobile Actions */}
          <div className="flex items-center space-x-3 md:hidden">
            <Link to="/cart" className="relative text-gray-700 hover:text-orange-600 transition">
              <FiShoppingCart className="w-6 h-6" />
              {getCartItemsCount() > 0 && (
                <span className="absolute -top-2 -right-2 bg-orange-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {getCartItemsCount()}
                </span>
              )}
            </Link>

            <Link to="/notifications" className="relative text-gray-700 hover:text-orange-600 transition" aria-label="Notifications">
              <FiBell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-orange-600 text-white text-xs rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>

            {user ? (
              <Link to="/sweetcoin" className="relative text-gray-700 hover:text-orange-600 transition" aria-label="SweetCoin">
                <span className="coin-glow">
                  <span className="text-lg leading-none">🪙</span>
                </span>
                {Math.max(0, Math.floor(Number(user?.sweetCoinBalance) || 0)) > 0 ? (
                  <span className="absolute -top-2 -right-2 bg-gray-900 text-white text-xs rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
                    {Math.max(0, Math.floor(Number(user?.sweetCoinBalance) || 0)) > 999
                      ? '999+'
                      : Math.max(0, Math.floor(Number(user?.sweetCoinBalance) || 0))}
                  </span>
                ) : null}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
