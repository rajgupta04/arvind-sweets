// Navbar component
import React from 'react';
import { Link } from 'react-router-dom';
import { useContext } from 'react';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import { FiShoppingCart, FiMenu, FiUser } from 'react-icons/fi';
import logo from '../components/arvindlogo.png';

function Navbar() {
  const { getCartItemsCount } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
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
            <button
              className="text-gray-700"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <FiMenu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-3">
            <Link to="/home" className="block text-gray-700 hover:text-orange-600">Home</Link>
            <Link to="/products" className="block text-gray-700 hover:text-orange-600">Products</Link>
            <Link to="/contact" className="block text-gray-700 hover:text-orange-600">Contact</Link>
            <Link to="/cart" className="block text-gray-700 hover:text-orange-600">Cart ({getCartItemsCount()})</Link>
            {user ? (
              <>
                {user.role === 'admin' ? (
                  <>
                    <Link to="/admin/profile" className="block text-gray-700 hover:text-orange-600">Admin Profile</Link>
                    <Link to="/admin" className="block text-gray-700 hover:text-orange-600">Admin Panel</Link>
                  </>
                ) : (
                  <Link to="/profile" className="block text-gray-700 hover:text-orange-600">My Profile</Link>
                )}
                <Link to="/orders" className="block text-gray-700 hover:text-orange-600">My Orders</Link>
                {user.role === 'delivery_boy' && (
                  <Link to="/delivery/my-packages" className="block text-gray-700 hover:text-orange-600">
                    My Packages
                  </Link>
                )}
              </>
            ) : (
              <Link to="/login" className="block text-gray-700 hover:text-orange-600">Login</Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
