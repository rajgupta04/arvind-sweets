// Navbar component
import React from 'react';
import { Link } from 'react-router-dom';
import { useContext } from 'react';
import { CartContext } from '../context/CartContext';
import { FiShoppingCart, FiMenu } from 'react-icons/fi';

function Navbar() {
  const { getCartItemsCount } = useContext(CartContext);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-orange-600">🍰 Arvind Sweets</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-gray-700 hover:text-orange-600 transition">Home</Link>
            <Link to="/products" className="text-gray-700 hover:text-orange-600 transition">Products</Link>
            <Link to="/contact" className="text-gray-700 hover:text-orange-600 transition">Contact</Link>

            <Link to="/cart" className="relative">
              <FiShoppingCart className="w-6 h-6 text-gray-700 hover:text-orange-600" />
              {getCartItemsCount() > 0 && (
                <span className="absolute -top-2 -right-2 bg-orange-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {getCartItemsCount()}
                </span>
              )}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-gray-700"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <FiMenu className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-3">
            <Link to="/" className="block text-gray-700 hover:text-orange-600">Home</Link>
            <Link to="/products" className="block text-gray-700 hover:text-orange-600">Products</Link>
            <Link to="/contact" className="block text-gray-700 hover:text-orange-600">Contact</Link>
            <Link to="/cart" className="block text-gray-700 hover:text-orange-600">Cart ({getCartItemsCount()})</Link>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
