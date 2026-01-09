// Cart context - global cart state
import React, { createContext, useState, useEffect } from 'react';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    const saved = localStorage.getItem('cartItems');
    const parsed = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(parsed)) return [];
    // Normalize older cart entries for compatibility
    return parsed.map((item) => {
      const isGift = Boolean(item?.isGift);
      const productId = item?.productId || (isGift ? item?.product : item?._id);
      return {
        ...item,
        productId: productId || item?.productId,
      };
    });
  });

  useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product, options) => {
    if (!product || !product._id) return;

    const pricingOptionId = options?.pricingOptionId ? String(options.pricingOptionId) : '';
    const pricingOptionLabel = options?.pricingOptionLabel ? String(options.pricingOptionLabel) : '';
    const pricingOptionPrice = options?.pricingOptionPrice;

    const lineId = pricingOptionId ? `${product._id}@${pricingOptionId}` : String(product._id);

    setCartItems((prevItems) => {
      const exists = prevItems.find((item) => item._id === lineId);
      if (exists) {
        return prevItems.map((item) =>
          item._id === lineId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      const base = { ...product };
      // Persist real product id separately from line id (important for checkout & suggestions)
      base.productId = String(product._id);
      base._id = lineId;

      if (pricingOptionId) {
        base.pricingOptionId = pricingOptionId;
        base.pricingOptionLabel = pricingOptionLabel;
        if (Number.isFinite(Number(pricingOptionPrice))) {
          base.price = Number(pricingOptionPrice);
        }
      }

      return [...prevItems, { ...base, quantity: 1 }];
    });
  };

  const addGiftToCart = (product) => {
    if (!product || !product._id) return;
    const giftLineId = `gift:${product._id}`;
    setCartItems((prevItems) => {
      const already = prevItems.find((i) => i._id === giftLineId);
      if (already) return prevItems;

      // Price is shown as free in UI; server validates isGift when placing order.
      return [
        ...prevItems,
        {
          ...product,
          _id: giftLineId,
          product: product._id,
          productId: product._id,
          isGift: true,
          price: 0,
          discount: 0,
          quantity: 1,
        },
      ];
    });
  };

  const removeFromCart = (productId) => {
    setCartItems(prevItems => prevItems.filter(item => item._id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems(prevItems =>
      prevItems.map(item =>
        item._id === productId
          ? (item?.isGift ? { ...item, quantity: 1 } : { ...item, quantity })
          : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartItemsCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      addGiftToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getCartTotal,
      getCartItemsCount
    }}>
      {children}
    </CartContext.Provider>
  );
};
