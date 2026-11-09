import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  useCartStore,
  useWishlistStore,
  useAuthStore,
  useLocationStore,
  useUIStore,
  useCatalogStore
} from '../store/useStore';
import { NAV_CATEGORIES } from '../data/appConfig';
const CATEGORIES = NAV_CATEGORIES;
import UnikartLogo from './UnikartLogo';
import {
  Search,
  MapPin,
  Heart,
  ShoppingCart,
  User,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Flame,
  Truck,
  ShieldCheck,
  Store,
  Headphones,
  LogOut,
  SlidersHorizontal,
  Package,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Tag,
  Smartphone,
  Shirt,
  Home as HomeIcon,
  ShoppingBasket,
  Activity,
  Armchair,
  Footprints,
  Gamepad2,
  BookOpen,
  Watch,
  Smile,
  Car
} from 'lucide-react';

const CATEGORY_ICON_MAP = {
  electronics: Smartphone,
  fashion: Shirt,
  'home-kitchen': HomeIcon,
  beauty: Sparkles,
  grocery: ShoppingBasket,
  sports: Activity,
  furniture: Armchair,
  footwear: Footprints,
  toys: Gamepad2,
  books: BookOpen,
  jewellery: Watch,
  baby: Smile,
  automotive: Car,
  pets: Heart,
  sale: Flame,
};

const POPULAR_SEARCH_TAGS = [
  'iPhone 16 Pro',
  'Nike Running Shoes',
  'Air Fryer 8.5L',
  'Dior Sauvage',
  'Organic Olive Oil',
  'LEGO Star Wars',
  'Ergonomic Office Chair',
  '925 Sterling Silver',
  'Espresso Machine',
  'Whiskas Cat Food'
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const { getTotals } = useCartStore();
  const { items: wishlistItems } = useWishlistStore();
  const { user, logout } = useAuthStore();
  const { pincode, city, place } = useLocationStore();
  const locationLabel = place ? `${place}, ${city}` : city;
  const { openLocationModal, toggleCartDrawer } = useUIStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const searchContainerRef = useRef(null);
  const mobileSearchContainerRef = useRef(null);
  const accountDropdownRef = useRef(null);
  const categoryMenuRef = useRef(null);

  const { itemCount, subtotal } = getTotals();
  const wishlistCount = wishlistItems.length;

  const { products: searchProductPool } = useCatalogStore();

  // Search suggestions filtering across all categories
  const filteredSuggestions = searchQuery.trim()
    ? searchProductPool.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.categoryLabel && p.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (p.subcategory && p.subcategory.toLowerCase().includes(searchQuery.toLowerCase()))
      ).slice(0, 6)
    : [];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearchFocused(false);
    navigate(`/catalog?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleSelectProduct = (productId) => {
    setIsSearchFocused(false);
    setSearchQuery('');
    navigate(`/product/${productId}`);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isInsideDesktop = searchContainerRef.current && searchContainerRef.current.contains(event.target);
      const isInsideMobile = mobileSearchContainerRef.current && mobileSearchContainerRef.current.contains(event.target);
      if (!isInsideDesktop && !isInsideMobile) {
        setIsSearchFocused(false);
      }
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target)) {
        setIsAccountDropdownOpen(false);
      }
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target)) {
        setIsCategoryMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeHoverCategory = hoveredCategory || CATEGORIES.find(c => c.id === 'electronics') || CATEGORIES[0];

  // Reusable search dropdown popup
  const renderSearchDropdown = () => {
    if (!isSearchFocused) return null;
    return (
      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 text-[#222222] animate-fadeIn max-h-[75vh] overflow-y-auto">
        {filteredSuggestions.length > 0 ? (
          <div>
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-[11px] font-bold uppercase text-gray-400 tracking-wider">
              <span>Suggested Marketplace Products</span>
              <span className="text-[10px] text-[#E31837]">Found {filteredSuggestions.length} matches</span>
            </div>
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {filteredSuggestions.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => handleSelectProduct(prod.id)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#FDF2F4] cursor-pointer transition-colors"
                >
                  <img
                    src={prod.image}
                    alt={prod.name}
                    className="w-10 h-10 object-contain rounded bg-white p-1 border border-gray-100 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{prod.name}</p>
                    <p className="text-[11px] text-gray-400">
                      {prod.brand} &bull; <span className="text-gray-600 font-medium">{prod.categoryLabel}</span>
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#E31837] shrink-0">
                    ₹{prod.price.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : searchQuery.trim() ? (
          <div className="p-4 text-center text-xs text-gray-500">
            No matching products found for "<span className="font-semibold text-gray-800">{searchQuery}</span>". Try another category keyword.
          </div>
        ) : (
          <div className="p-3.5 space-y-2">
            <div className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Popular Searches</div>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_SEARCH_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setSearchQuery(tag);
                    navigate(`/catalog?q=${encodeURIComponent(tag)}`);
                    setIsSearchFocused(false);
                  }}
                  className="px-2.5 py-1 rounded-full text-xs bg-gray-100 hover:bg-[#FFE8EC] hover:text-[#E31837] text-gray-700 transition-colors cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-50 shadow-md">
      {/* 1. Main Dark Charcoal Header (#252525) */}
      <div className="bg-[#252525] text-white">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-2 sm:py-2.5">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            
            {/* Left: Mobile Toggle + UNIKART Logo + Category Mega Menu Button */}
            <div className="flex items-center gap-2 sm:gap-3 md:gap-5 shrink-0">
              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-1.5 text-gray-300 hover:text-white rounded-lg focus:outline-none cursor-pointer"
                aria-label="Toggle Navigation"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>

              {/* UNIKART Universal Marketplace Brand Logo */}
              <Link to="/" className="group focus:outline-none flex items-center">
                <UnikartLogo variant="white" iconSize={32} showTagline={false} />
              </Link>

              {/* Category Menu Button (Desktop Mega Dropdown) */}
              <div className="relative hidden lg:block" ref={categoryMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    isCategoryMenuOpen
                      ? 'bg-[#E31837] text-white'
                      : 'bg-[#333333] hover:bg-[#3d3d3d] text-gray-200'
                  }`}
                >
                  <Menu className="w-4 h-4" />
                  <span>All Categories</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isCategoryMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Mega Dropdown Menu with 14 Categories + Subcategories */}
                {isCategoryMenuOpen && (
                  <div className="absolute left-0 top-full mt-2 w-[720px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 text-[#222222] animate-fadeIn grid grid-cols-12">
                    {/* Left Column: 14 Main Categories */}
                    <div className="col-span-5 bg-gray-50 border-r border-gray-100 py-3 max-h-[460px] overflow-y-auto">
                      <div className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Marketplace Departments (14)
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {CATEGORIES.filter(c => c.id !== 'all').map((cat) => {
                          const IconComp = CATEGORY_ICON_MAP[cat.id] || Layers;
                          const isHovered = activeHoverCategory?.id === cat.id;

                          return (
                            <div
                              key={cat.id}
                              onMouseEnter={() => setHoveredCategory(cat)}
                              onClick={() => {
                                setIsCategoryMenuOpen(false);
                                navigate(`/catalog?category=${cat.slug}`);
                              }}
                              className={`flex items-center justify-between px-4 py-2 cursor-pointer text-xs font-semibold transition-colors ${
                                isHovered
                                  ? 'bg-white text-[#E31837] border-l-4 border-[#E31837]'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <IconComp className={`w-4 h-4 shrink-0 ${isHovered ? 'text-[#E31837]' : 'text-gray-400'}`} />
                                <span className="truncate">{cat.name}</span>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right Column: Subcategories & Quick Explore */}
                    <div className="col-span-7 p-5 flex flex-col justify-between max-h-[460px] overflow-y-auto">
                      {activeHoverCategory && (
                        <div>
                          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <div>
                              <h4 className="text-sm font-black text-gray-900 tracking-tight">
                                {activeHoverCategory.name}
                              </h4>
                              <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                                {activeHoverCategory.description}
                              </p>
                            </div>
                            <Link
                              to={`/catalog?category=${activeHoverCategory.slug}`}
                              onClick={() => setIsCategoryMenuOpen(false)}
                              className="text-xs font-bold text-[#E31837] hover:underline shrink-0 ml-2"
                            >
                              View All
                            </Link>
                          </div>

                          {/* Subcategories list */}
                          <div className="mt-4">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                              Top Subcategories
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              {activeHoverCategory.subcategories?.map((sub) => (
                                <Link
                                  key={sub}
                                  to={`/catalog?category=${activeHoverCategory.slug}&q=${encodeURIComponent(sub)}`}
                                  onClick={() => setIsCategoryMenuOpen(false)}
                                  className="text-xs text-gray-700 hover:text-[#E31837] py-1.5 px-2 rounded-md hover:bg-[#FDF2F4] transition-colors truncate"
                                >
                                  • {sub}
                                </Link>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Promo Strip in Mega Menu */}
                      <div className="mt-6 pt-3 border-t border-gray-100 flex items-center justify-between bg-red-50 p-3 rounded-xl">
                        <div className="flex items-center gap-2">
                          <Flame className="w-4 h-4 text-[#E31837]" />
                          <span className="text-xs font-bold text-gray-900">
                            Looking for special offers?
                          </span>
                        </div>
                        <Link
                          to="/catalog?deals=true"
                          onClick={() => setIsCategoryMenuOpen(false)}
                          className="text-xs font-bold text-[#E31837] hover:underline"
                        >
                          Explore Lightning Deals &rarr;
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Center: Desktop Large Universal Search Bar (Hidden on Mobile) */}
            <div className="hidden md:block flex-1 max-w-2xl relative" ref={searchContainerRef}>
              <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  placeholder="Search for smartphones, sneakers, air fryers, perfumes, groceries, watches..."
                  className="w-full h-10 md:h-11 pl-4 pr-12 rounded-lg bg-white text-[#222222] placeholder-gray-400 text-xs md:text-sm font-normal focus:outline-none focus:ring-2 focus:ring-[#E31837] shadow-inner transition-all"
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1 bottom-1 px-3.5 bg-[#E31837] hover:bg-[#C7122E] text-white rounded-md flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Search"
                >
                  <Search className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </form>
              {renderSearchDropdown()}
            </div>

            {/* Right: Deliver Location + Wishlist + Account + Shopping Cart */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">

              {/* Delivery Pin Dropdown (Desktop & Tablet) */}
              <button
                type="button"
                onClick={openLocationModal}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#333333] hover:bg-[#3d3d3d] text-left text-xs transition-colors cursor-pointer"
                title={`Delivering to ${locationLabel} ${pincode} - Click to change`}
              >
                <MapPin className="w-3.5 h-3.5 text-[#E31837] shrink-0" />
                <div className="flex flex-col -space-y-0.5 leading-tight">
                  <span className="text-[10px] text-gray-400">Deliver to</span>
                  <span className="font-bold text-gray-200 truncate max-w-[140px] lg:max-w-[180px]" title={`${locationLabel} ${pincode}`}>{locationLabel} {pincode}</span>
                </div>
              </button>

              {/* Mobile Location Quick Button (< md) */}
              <button
                type="button"
                onClick={openLocationModal}
                className="md:hidden flex items-center justify-center p-2 rounded-lg bg-[#333333] hover:bg-[#3d3d3d] text-gray-200 hover:text-white transition-colors cursor-pointer"
                title={`Deliver to: ${locationLabel} (${pincode})`}
                aria-label="Change delivery location"
              >
                <MapPin className="w-4 h-4 text-[#E31837]" />
              </button>

              {/* Wishlist Link */}
              <Link
                to="/account?tab=wishlist"
                className="relative flex items-center justify-center p-2 rounded-lg hover:bg-[#333333] text-gray-200 hover:text-white transition-colors"
                title="Wishlist"
              >
                <Heart className="w-5 h-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#E31837] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-xs">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              {/* Account Dropdown */}
              <div className="relative" ref={accountDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                  className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg hover:bg-[#333333] text-gray-200 hover:text-white transition-colors cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-[#E31837]/20 border border-[#E31837]/40 flex items-center justify-center text-[#E31837] shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="hidden sm:flex flex-col text-left leading-tight">
                    <span className="text-[10px] text-gray-400">
                      {user ? 'Welcome,' : 'Hello, Sign in'}
                    </span>
                    <span className="text-xs font-bold text-white truncate max-w-[90px] lg:max-w-[110px]">
                      {user ? user.name.split(' ')[0] : 'My Account'}
                    </span>
                  </div>
                  <ChevronDown className="w-3 h-3 text-gray-400 hidden sm:block shrink-0" />
                </button>

                {/* Account Menu */}
                {isAccountDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-50 text-[#222222] animate-fadeIn">
                    {user ? (
                      <>
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="text-xs font-bold text-gray-900">{user.name}</p>
                          <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                        </div>
                        <div className="py-1">
                          <Link
                            to="/account"
                            onClick={() => setIsAccountDropdownOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:text-[#E31837] hover:bg-[#FDF2F4] transition-colors"
                          >
                            <User className="w-3.5 h-3.5" /> My Profile
                          </Link>
                          <Link
                            to="/account?tab=orders"
                            onClick={() => setIsAccountDropdownOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:text-[#E31837] hover:bg-[#FDF2F4] transition-colors"
                          >
                            <Package className="w-3.5 h-3.5" /> Track Orders
                          </Link>
                          <Link
                            to="/account?tab=wishlist"
                            onClick={() => setIsAccountDropdownOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:text-[#E31837] hover:bg-[#FDF2F4] transition-colors"
                          >
                            <Heart className="w-3.5 h-3.5" /> Saved Wishlist
                          </Link>
                        </div>

                        <div className="border-t border-gray-100 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              logout();
                              setIsAccountDropdownOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 text-left transition-colors cursor-pointer"
                          >
                            <LogOut className="w-3.5 h-3.5" /> Sign Out
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="p-3 text-center space-y-2">
                        <Link
                          to="/login"
                          onClick={() => setIsAccountDropdownOpen(false)}
                          className="w-full block py-2 rounded-lg bg-[#E31837] hover:bg-[#C7122E] text-white font-bold text-xs shadow-sm transition-colors"
                        >
                          Sign In / Register
                        </Link>
                        <p className="text-[11px] text-gray-400">
                          New customer?{' '}
                          <Link
                            to="/register"
                            onClick={() => setIsAccountDropdownOpen(false)}
                            className="text-[#E31837] font-semibold hover:underline"
                          >
                            Start here
                          </Link>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Shopping Cart Button */}
              <button
                type="button"
                onClick={toggleCartDrawer}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#E31837] hover:bg-[#C7122E] text-white transition-all shadow-sm cursor-pointer"
              >
                <div className="relative">
                  <ShoppingCart className="w-5 h-5" />
                  {itemCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-white text-[#E31837] text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center shadow-xs">
                      {itemCount}
                    </span>
                  )}
                </div>
                <div className="hidden md:flex flex-col text-left leading-tight">
                  <span className="text-[10px] text-red-100 uppercase font-semibold">Cart</span>
                  <span className="text-xs font-bold text-white">
                    ₹{subtotal.toLocaleString('en-IN')}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Mobile Full-Width Search Bar (Row 2 on Mobile screens < md) */}
          <div className="md:hidden pt-2 pb-0.5 relative" ref={mobileSearchContainerRef}>
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Search products, brands, categories..."
                className="w-full h-10 pl-3.5 pr-11 rounded-lg bg-white text-[#222222] placeholder-gray-400 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-[#E31837] shadow-inner transition-all"
              />
              <button
                type="submit"
                className="absolute right-1 top-1 bottom-1 px-3 bg-[#E31837] hover:bg-[#C7122E] text-white rounded-md flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>
            {renderSearchDropdown()}
          </div>
        </div>
      </div>

      {/* 2. Horizontal Clean Multi-Category Navigation Bar */}
      <div className="bg-white border-b border-[#E8E8E8] shadow-xs">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6">
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-2 text-xs">
            {NAV_CATEGORIES.map((cat) => {
              const isActive =
                cat.slug === 'sale'
                  ? location.search.includes('deals=true')
                  : location.search.includes(`category=${cat.slug}`);

              const IconComp = CATEGORY_ICON_MAP[cat.slug] || Layers;

              return (
                <Link
                  key={cat.id}
                  to={cat.isSale ? '/catalog?deals=true' : `/catalog?category=${cat.slug}`}
                  className={`group px-2.5 sm:px-3 py-1.5 rounded-md font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 shrink-0 ${
                    cat.isSale
                      ? 'bg-[#E31837] text-white hover:bg-[#C7122E] shadow-xs'
                      : isActive
                      ? 'text-[#E31837] bg-[#FDF2F4] font-bold'
                      : 'text-[#222222] hover:text-[#E31837] hover:bg-gray-100'
                  }`}
                >
                  {cat.isSale ? (
                    <Flame className="w-3.5 h-3.5 animate-pulse text-amber-300 shrink-0" />
                  ) : (
                    <IconComp className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#E31837] shrink-0" />
                  )}
                  <span>{cat.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 3. Mobile Navigation Drawer (Multi-Category) */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex">
          {/* Backdrop close area */}
          <div className="fixed inset-0" onClick={() => setIsMobileMenuOpen(false)} />

          <div className="relative w-4/5 max-w-xs bg-white h-full flex flex-col shadow-2xl z-10 animate-slideRight">
            <div className="p-4 bg-[#252525] text-white flex items-center justify-between">
              <UnikartLogo variant="white" iconSize={28} showTagline={false} />
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 rounded text-gray-300 hover:text-white cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Mobile Drawer Location Selector */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  openLocationModal();
                }}
                className="w-full p-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-red-50 text-[#E31837] flex items-center justify-center shrink-0">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-gray-500 uppercase font-semibold">Delivery Location</p>
                    <p className="text-xs font-bold text-gray-900 truncate">{locationLabel} - {pincode}</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-[#E31837] shrink-0 ml-2">Change</span>
              </button>

              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  All Marketplace Categories
                </p>
                <div className="space-y-1">
                  {NAV_CATEGORIES.map((cat) => {
                    const IconComp = CATEGORY_ICON_MAP[cat.slug] || Layers;
                    return (
                      <Link
                        key={cat.id}
                        to={cat.isSale ? '/catalog?deals=true' : `/catalog?category=${cat.slug}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
                          cat.isSale
                            ? 'text-[#E31837] bg-red-50'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <IconComp className={`w-4 h-4 shrink-0 ${cat.isSale ? 'text-[#E31837]' : 'text-gray-400'}`} />
                        <span className="truncate">{cat.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  My Shopping
                </p>
                <div className="space-y-1">
                  <Link
                    to="/account?tab=orders"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Track Orders
                  </Link>
                  <Link
                    to="/account?tab=wishlist"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100"
                  >
                    My Wishlist ({wishlistCount})
                  </Link>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50">
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 rounded-lg border border-red-200 text-red-600 font-bold text-xs cursor-pointer hover:bg-red-50 transition-colors"
                >
                  Sign Out
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full block text-center py-2.5 rounded-lg bg-[#E31837] text-white font-bold text-xs shadow-sm hover:bg-[#C7122E] transition-colors"
                >
                  Sign In / Register
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
