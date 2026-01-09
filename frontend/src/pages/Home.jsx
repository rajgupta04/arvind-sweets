// Home page component
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getProducts } from '../services/productService';
import ProductCard from '../components/ProductCard';
import Loader from '../components/Loader';
import { FiArrowRight } from 'react-icons/fi';
import { getOptimizedImageUrl } from '../lib/cloudinary.js';
import { getActiveOffer } from '../services/offerService.js';

const heroHighlights = [
  {
    title: 'Fresh mithai, everyday',
    description: 'Hand-rolled laddus, slow-cooked kalakand & strawberry specials straight from our kitchen.',
  },
  {
    title: 'Curated gifting',
    description: 'Build bespoke hampers for weddings, baby announcements, festivals & corporate cheer.',
  },
];

const heroStats = [
  { label: 'Mithai Made Daily', value: '100% Fresh' },
  { label: 'Happy Local Customers', value: '500+' },
  { label: 'Within Hariharganj & Nearby Areas', value: 'Fast Delivery' },
];

const heroImage =
  'https://res.cloudinary.com/dcy5dhgcg/image/upload/v1763649666/banner_qx6yy6.png';

function Home() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeOffer, setActiveOffer] = useState(null);

  const MotionLink = motion(Link);

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  useEffect(() => {
    const loadOffer = async () => {
      try {
        const data = await getActiveOffer();
        setActiveOffer(data || null);
      } catch {
        setActiveOffer(null);
      }
    };

    loadOffer();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      const response = await getProducts({ featured: 'true' });
      // Axios wraps response in data property
      const products = response.data || [];
      setFeaturedProducts(Array.isArray(products) ? products.slice(0, 12) : []);
    } catch (error) {
      console.error('Error fetching featured products:', error);
      // Set empty array on error so page still loads
      setFeaturedProducts([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div>
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#fff8f0] via-white to-[#ffe7d1]">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-orange-200 rounded-full blur-3xl opacity-60" />
        <div className="absolute -bottom-16 -left-10 w-72 h-72 bg-yellow-200 rounded-full blur-3xl opacity-40" />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center"
        >
          {/* Left copy */}
          <div className="space-y-8">
            <div className="inline-flex items-center space-x-2 bg-white/80 border border-orange-100 rounded-full px-4 py-2 text-sm font-medium text-orange-600 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span>Your neighbourhood sweet shop, reimagined.</span>
            </div>

            <div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight">
                Heritage mithai & curated hampers for every celebration.
              </h1>
              <p className="mt-5 text-lg text-gray-600 max-w-xl">
                Discover playful takes on timeless sweets — think chocolate kaju katli, strawberry rasgulla tiramisu
                and limited-edition hampers crafted for weddings, baby announcements, Diwali & everything in between.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link
                to="/products"
                className="inline-flex items-center px-6 py-3 rounded-lg bg-orange-600 text-white font-semibold shadow-lg shadow-orange-200 hover:bg-orange-700 transition"
              >
                Shop the Collection <FiArrowRight className="ml-2" />
              </Link>
              <Link
                to="/products?category=Hampers"
                className="inline-flex items-center px-6 py-3 rounded-lg border border-gray-300 text-gray-800 font-semibold hover:bg-white transition"
              >
                Build a Hamper
              </Link>
            </div>

            <div className="grid gap-4">
              {heroHighlights.map((highlight) => (
                <div
                  key={highlight.title}
                  className="bg-white/80 border border-orange-100 p-4 rounded-xl shadow-sm"
                >
                  <h3 className="font-semibold text-gray-900">{highlight.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{highlight.description}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-6 pt-4 border-t border-orange-100">
              {heroStats.map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right visual */}
          <motion.div
            className="relative"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="rounded-[32px] bg-white shadow-2xl p-6 lg:p-8">
              <div className="aspect-[4/5] rounded-3xl overflow-hidden relative">
                <img
                  src={getOptimizedImageUrl(heroImage)}
                  alt="Premium mithai hampers"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>
              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
                  <p className="text-xs uppercase tracking-wide text-orange-500">Seasonal Drop</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    Strawberry Kalakand Cheesecake
                  </p>
                  <p className="text-xs text-gray-600 mt-2">Hariharganj pick-up & same-day gifting</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Signature</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    Chocolate Lover’s Hamper
                  </p>
                  <p className="text-xs text-gray-600 mt-2">Dark chocolate kaju katli, butterscotch barks & more</p>
                </div>
              </div>
            </div>
            {/* <div className="absolute -left-6 -bottom-6 bg-white shadow-lg rounded-2xl px-6 py-4 text-sm font-semibold text-gray-800">
              Verified by 3,500+ celebrations
            </div> */}
          </motion.div>
        </motion.div>
      </section>

      {/* Shop Story
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold text-center mb-6">Our Story</h2>
          <p className="text-gray-700 text-lg text-center max-w-3xl mx-auto">
            Arvind Sweets has been serving the community with authentic, handcrafted sweets for over 30 years. 
            We use traditional recipes passed down through generations, combined with the finest ingredients to bring you 
            the most delicious and memorable sweets. Every bite tells a story of love, tradition, and dedication to excellence.
          </p>
        </div>
      </div> */}

      {/* Categories */}
    <div className="bg-gray-100 py-12">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <h2 className="text-3xl font-bold text-center mb-8">Shop by Category</h2>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {[
        { category: "Bengali Sweets", icon: "🍮" },
        { category: "Dry Sweets", icon: "🍡" },
        { category: "Snacks", icon: "🥟" },
        { category: "Seasonal", icon: "🎁" },
        { category: "Fastfood", icon: "🍔" },
        { category: "Beverages", icon: "🥤" },
      ].map(({ category, icon }) => (
        <MotionLink
          key={category}
          to={`/products?category=${category}`}
          className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-xl transition-transform hover:scale-105"
        >
          <motion.div
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.6 }}
            className="text-4xl mb-3"
          >
            {icon}
          </motion.div>
          <h3 className="font-semibold text-gray-800">{category}</h3>
        </MotionLink>
      ))}
    </div>
  </div>
</div>


      {/* Featured Products */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Featured Sweets</h2>
          <Link
            to="/products"
            className="text-orange-600 hover:text-orange-700 font-semibold flex items-center"
          >
            View All <FiArrowRight className="ml-1" />
          </Link>
        </div>
        {featuredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-12">No featured products available</p>
        )}
      </div>

      {/* Special Offers */}
      {activeOffer ? (
        (() => {
          const title = activeOffer?.title;
          const description = activeOffer?.description;
          const ctaText = activeOffer?.ctaText;
          const ctaLink = activeOffer?.ctaLink;
          const showCta = Boolean(ctaText && ctaLink);
          const isExternal =
            typeof ctaLink === 'string' && /^https?:\/\//i.test(ctaLink);

          return (
            <div className="bg-orange-600 text-white py-12">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                {title ? <h2 className="text-3xl font-bold mb-4">{title}</h2> : null}
                {description ? <p className="text-xl mb-6">{description}</p> : null}

                {showCta ? (
                  isExternal ? (
                    <a
                      href={ctaLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block bg-white text-orange-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
                    >
                      {ctaText}
                    </a>
                  ) : (
                    <Link
                      to={ctaLink}
                      className="inline-block bg-white text-orange-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
                    >
                      {ctaText}
                    </Link>
                  )
                ) : null}
              </div>
            </div>
          );
        })()
      ) : null}
    </div>
  );
}

export default Home;
