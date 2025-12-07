// Footer component
import React from 'react';
import { Link } from 'react-router-dom';
import { FiFacebook, FiTwitter, FiInstagram, FiPhone, FiMail } from 'react-icons/fi';

function Footer() {
  return (
    <footer className="bg-gray-800 text-white mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Arvind Sweets</h3>
            <p className="text-gray-300 text-sm">
              Serving delicious sweets and Your trusted sweet shop for traditional and modern delicacies.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="text-gray-300 hover:text-white">Home</Link></li>
              <li><Link to="/products" className="text-gray-300 hover:text-white">Products</Link></li>
              <li><Link to="/contact" className="text-gray-300 hover:text-white">Contact Us</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Categories</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/products?category=Bengali Sweets" className="text-gray-300 hover:text-white">Bengali Sweets</Link></li>
              <li><Link to="/products?category=Dry Sweets" className="text-gray-300 hover:text-white">Dry Sweets</Link></li>
              <li><Link to="/products?category=Snacks" className="text-gray-300 hover:text-white">Snacks</Link></li>
              <li><Link to="/products?category=Seasonal" className="text-gray-300 hover:text-white">Seasonal</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <FiPhone className="w-4 h-4" />
                <span className="text-gray-300">+91 8083834895</span>
              </div>
              <div className="flex items-center space-x-2">
                <FiMail className="w-4 h-4" />
                <span className="text-gray-300" >arvindsweetshariharganj@gmail.com</span>
              </div>
            </div>
            <div className="flex space-x-4 mt-4">
              <a href="#" className="text-gray-300 hover:text-white"><FiFacebook className="w-5 h-5" /></a>
              <a href="#" className="text-gray-300 hover:text-white"><FiTwitter className="w-5 h-5" /></a>
              <a href="https://www.instagram.com/arvindsweets" className="text-gray-300 hover:text-white"><FiInstagram className="w-5 h-5" /></a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-300">
          <p>&copy; 2025 Arvind Sweets. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
