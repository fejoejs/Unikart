import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useCartStore, useWishlistStore, useUIStore } from '../store/useStore';
import { Home, Layers, Flame, ShoppingCart, User, Heart } from 'lucide-react';

export default function MobileBottomNav() {
  const location = useLocation();
  const { getTotals } = useCartStore();
  const { items: wishlistItems } = useWishlistStore();
  const { toggleCartDrawer } = useUIStore();
  const { itemCount } = getTotals();

  const isDealsActive = location.pathname === '/catalog' && location.search.includes('deals=true');
  const isCategoriesActive = location.pathname === '/catalog' && !location.search.includes('deals=true');

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E8E8E8] md:hidden pt-1.5 pb-safe px-3 shadow-lg">
      <div className="flex items-center justify-around">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-bold transition-colors ${
              isActive ? 'text-[#E31837]' : 'text-gray-500 hover:text-[#222222]'
            }`
          }
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/catalog"
          className={() =>
            `flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-bold transition-colors ${
              isCategoriesActive ? 'text-[#E31837]' : 'text-gray-500 hover:text-[#222222]'
            }`
          }
        >
          <Layers className="w-5 h-5 mb-0.5" />
          <span>Categories</span>
        </NavLink>

        <NavLink
          to="/catalog?deals=true"
          className={() =>
            `flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-bold transition-colors ${
              isDealsActive ? 'text-[#E31837]' : 'text-gray-500 hover:text-[#E31837]'
            }`
          }
        >
          <Flame className="w-5 h-5 mb-0.5 text-[#E31837]" />
          <span>Deals</span>
        </NavLink>

        <NavLink
          to="/account?tab=wishlist"
          aria-label={`Wishlist (${wishlistItems.length} items)`}
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-bold transition-colors relative ${
              isActive ? 'text-[#E31837]' : 'text-gray-500 hover:text-[#222222]'
            }`
          }
        >
          <div className="relative">
            <Heart className="w-5 h-5 mb-0.5" />
            {wishlistItems.length > 0 && (
              <span className="absolute -top-1 -right-2 bg-[#E31837] text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                {wishlistItems.length}
              </span>
            )}
          </div>
          <span>Wishlist</span>
        </NavLink>

        <button
          type="button"
          onClick={toggleCartDrawer}
          aria-label={`Shopping cart with ${itemCount} items`}
          className="flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-bold text-gray-500 hover:text-[#222222] relative transition-colors cursor-pointer"
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5 mb-0.5" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-[#E31837] text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </div>
          <span>Cart</span>
        </button>

        <NavLink
          to="/account"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-bold transition-colors ${
              isActive ? 'text-[#E31837]' : 'text-gray-500 hover:text-[#222222]'
            }`
          }
        >
          <User className="w-5 h-5 mb-0.5" />
          <span>Account</span>
        </NavLink>
      </div>
    </div>
  );
}
