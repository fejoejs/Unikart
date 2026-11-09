import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import {
  HERO_SLIDES,
  PROMO_BANNERS,
  TOP_BRANDS,
  CUSTOMER_BENEFITS,
  NAV_CATEGORIES,
  NO_IMAGE_PLACEHOLDER
} from '../data/appConfig';
import ProductCard from '../components/ProductCard';
import { useCatalogStore } from '../store/useStore';
import {
  Flame,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  ShieldCheck,
  Truck,
  RotateCcw,
  Headphones,
  Star,
  CheckCircle2,
  TrendingUp,
  Tag,
  Zap,
  Mail,
  Smartphone,
  Shirt,
  Home as HomeIcon,
  ShoppingBasket,
  Activity,
  Heart,
  Grid,
  Gift,
  Layers,
  Award
} from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();

  // 1. Hero Carousel State
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [isPaused]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  // 2. Countdown Timer State for Today's Lightning Deals
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    hours: 8,
    minutes: 42,
    seconds: 19
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 12, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const { products: catalogProducts } = useCatalogStore();
  const allProducts = catalogProducts || [];

  // Filtered Product Shelves across Multiple Categories (Memoized for high performance)
  const bestSellerProducts = useMemo(() => allProducts.filter((p) => p.isBestseller || p.rating >= 4.7).slice(0, 12), [allProducts]);
  const dealProducts = useMemo(() => allProducts.filter((p) => p.isDeal).slice(0, 6), [allProducts]);
  const trendingProducts = useMemo(() => allProducts.filter((p) => p.isTrending).slice(0, 6), [allProducts]);
  const fashionProducts = useMemo(() => allProducts.filter((p) => p.category === 'fashion' || p.category === 'footwear').slice(0, 6), [allProducts]);
  const electronicsProducts = useMemo(() => allProducts.filter((p) => p.category === 'electronics').slice(0, 6), [allProducts]);
  const homeProducts = useMemo(() => allProducts.filter((p) => p.category === 'home-kitchen' || p.category === 'furniture').slice(0, 6), [allProducts]);
  const beautyProducts = useMemo(() => allProducts.filter((p) => p.category === 'beauty').slice(0, 6), [allProducts]);
  const groceryProducts = useMemo(() => allProducts.filter((p) => p.category === 'grocery').slice(0, 6), [allProducts]);
  const sportsProducts = useMemo(() => allProducts.filter((p) => p.category === 'sports').slice(0, 6), [allProducts]);
  const newArrivals = useMemo(() => allProducts.filter((p) =>
    ['sports', 'fashion', 'toys', 'furniture', 'beauty', 'automotive'].includes(p.category)
  ).slice(0, 6), [allProducts]);
  const recommendedProducts = useMemo(() => allProducts.filter((p) =>
    ['books', 'jewellery', 'pets', 'baby', 'electronics', 'home-kitchen'].includes(p.category)
  ).slice(0, 6), [allProducts]);

  // Newsletter state
  const [emailSub, setEmailSub] = useState('');
  const [subSuccess, setSubSuccess] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const [subMessage, setSubMessage] = useState('');
  const [subError, setSubError] = useState('');

  const handleSubscribe = async (e) => {
    e.preventDefault();
    const emailToSub = emailSub.trim();
    if (!emailToSub) return;
    setSubLoading(true);
    setSubError('');
    setSubMessage('');

    try {
      const res = await api.post('/newsletter/subscribe', { email: emailToSub });
      setSubMessage(res.data?.message || 'Thank you for subscribing! Your welcome coupon is ready.');
      setSubSuccess(true);
      setEmailSub('');
      setTimeout(() => setSubSuccess(false), 6000);
    } catch (err) {
      setSubError(err.response?.data?.detail || 'Failed to subscribe. Please try again.');
    } finally {
      setSubLoading(false);
    }
  };

  const activeSlide = HERO_SLIDES[currentSlide];

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-16 space-y-8 sm:space-y-12">
      
      {/* ================= 1. PROMOTIONAL HERO CAROUSEL ================= */}
      <section
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-4 sm:pt-6"
      >
        <div className="relative rounded-2xl overflow-hidden shadow-card bg-gradient-to-r from-[#E31837] via-[#F42B50] to-[#F05A82] text-white">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center min-h-[380px] sm:min-h-[440px] p-6 sm:p-10 lg:p-14 gap-6">
            
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-6 z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold tracking-wide border border-white/30">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{activeSlide.badge}</span>
                <span className="bg-white text-[#E31837] px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                  {activeSlide.discountBadge}
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-sm">
                {activeSlide.headline}
              </h1>

              <p className="text-xs sm:text-sm text-red-50 max-w-xl leading-relaxed">
                {activeSlide.subtext}
              </p>

              {/* Price Highlight pill */}
              {activeSlide.priceText && (
                <div className="flex items-baseline gap-2 pt-1 flex-wrap">
                  <span className="text-xl sm:text-2xl font-black text-white">{activeSlide.priceText}</span>
                  {activeSlide.originalPriceText && (
                    <span className="text-xs sm:text-sm text-white/70 line-through">{activeSlide.originalPriceText}</span>
                  )}
                  <span className="text-xs text-white/90 font-medium">({activeSlide.productName})</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Link
                  to={activeSlide.ctaLink}
                  className="px-6 py-3 rounded-xl bg-white text-[#E31837] hover:bg-gray-100 font-black text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <span>{activeSlide.ctaText}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to={activeSlide.secondaryCtaLink}
                  className="px-5 py-3 rounded-xl bg-black/40 hover:bg-black/60 text-white font-bold text-xs sm:text-sm border border-white/25 transition-all hidden sm:flex items-center gap-1.5"
                >
                  <span>{activeSlide.secondaryCtaText}</span>
                </Link>
              </div>
            </div>

            {/* Right Lifestyle Photography Column */}
            <div className="lg:col-span-5 relative flex items-center justify-center z-10">
              <div className="relative w-full max-w-sm sm:max-w-md aspect-4/3 sm:aspect-square flex items-center justify-center p-3">
                <img
                  src={activeSlide.image}
                  alt={activeSlide.headline}
                  onError={(e) => { e.currentTarget.src = NO_IMAGE_PLACEHOLDER; }}
                  className="relative z-10 max-h-72 sm:max-h-80 w-full object-cover rounded-2xl drop-shadow-2xl hover:scale-105 transition-transform duration-500 shadow-2xl"
                />
              </div>
            </div>
          </div>

          {/* Navigation Arrows */}
          <button
            type="button"
            onClick={prevSlide}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/30 hover:bg-white text-white hover:text-[#E31837] flex items-center justify-center shadow-md transition-all"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/30 hover:bg-white text-white hover:text-[#E31837] flex items-center justify-center shadow-md transition-all"
            aria-label="Next Slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Pagination Indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            {HERO_SLIDES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentSlide(idx)}
                className={`transition-all rounded-full h-2 ${
                  currentSlide === idx ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ================= 2. POPULAR CATEGORIES (Single Row with Images + View All) ================= */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#222222] tracking-tight">
              Popular Categories
            </h2>
            <p className="text-xs text-[#777777]">Explore top shopping departments across UNIKART</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAllCategories((prev) => !prev)}
            className="text-xs font-bold text-[#E31837] hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-0"
          >
            {showAllCategories ? 'Show Less' : 'View All Categories'} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Categories Single Row (or expanded when View All is clicked) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 transition-all duration-300">
          {(showAllCategories
            ? NAV_CATEGORIES.filter((c) => c.id !== 'sale')
            : NAV_CATEGORIES.filter((c) => c.id !== 'sale').slice(0, 8)
          ).map((cat) => (
            <Link
              key={cat.id}
              to={`/catalog?category=${cat.slug}`}
              className="group bg-white rounded-2xl border border-[#E8E8E8] hover:border-[#E31837]/50 p-3 flex flex-col items-center text-center shadow-xs hover:shadow-card transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center mb-2.5 border border-gray-100 group-hover:border-[#E31837]/30 transition-colors">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex';
                  }}
                />
                <span style={{ display: 'none' }} className="text-2xl">🛍️</span>
              </div>
              <h3 className="text-xs font-bold text-[#222222] group-hover:text-[#E31837] transition-colors truncate w-full">
                {cat.name}
              </h3>
            </Link>
          ))}
        </div>
      </section>

      {/* ================= 3. BEST SELLERS (Mixed Multi-Category Selection) ================= */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-[#222222] tracking-tight">
                Best Sellers Across Marketplace
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#252525] text-white uppercase">
                Multi-Category Top Picks
              </span>
            </div>
            <p className="text-xs text-[#777777]">Most popular products bought by verified customers</p>
          </div>
          <Link
            to="/catalog?sort=rating"
            className="text-xs font-bold text-[#E31837] hover:underline flex items-center gap-1"
          >
            View All Best Sellers <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 6 Cards per row on desktop (2 rows of 6 = 12 diverse products) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-3.5">
          {bestSellerProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* ================= 4. TODAY'S BEST DEALS (Countdown + Multi-Category Deals) ================= */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-xl border border-[#E8E8E8] p-4 sm:p-5 shadow-xs">
          {/* Header Strip with Countdown Timer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-[#F0F0F0]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#E31837] text-white flex items-center justify-center">
                <Flame className="w-5 h-5 animate-pulse text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-[#222222] tracking-tight">
                    Today's Best Deals
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-100 text-[#E31837] uppercase">
                    Lightning Offers
                  </span>
                </div>
                <p className="text-xs text-[#777777]">Grab limited-stock discounts across all categories before time expires</p>
              </div>
            </div>

            {/* Countdown Box */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#777777] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#E31837]" /> Ends in:
              </span>
              <div className="flex items-center gap-1 font-mono text-xs font-bold">
                <span className="px-2 py-1 rounded bg-[#252525] text-white">
                  {String(timeLeft.hours).padStart(2, '0')}h
                </span>
                <span>:</span>
                <span className="px-2 py-1 rounded bg-[#252525] text-white">
                  {String(timeLeft.minutes).padStart(2, '0')}m
                </span>
                <span>:</span>
                <span className="px-2 py-1 rounded bg-[#E31837] text-white">
                  {String(timeLeft.seconds).padStart(2, '0')}s
                </span>
              </div>
              <Link
                to="/catalog?deals=true"
                className="ml-3 text-xs font-bold text-[#E31837] hover:underline hidden sm:flex items-center gap-1"
              >
                View All Deals <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* 6 Deals per row on desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-3.5">
            {dealProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* ================= 5. TRENDING ACROSS CATEGORIES ================= */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-[#222222] tracking-tight">
                Trending Across Categories
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E31837] text-white uppercase">
                Trending Now
              </span>
            </div>
            <p className="text-xs text-[#777777]">Most viewed and high-demand products this week</p>
          </div>
          <Link
            to="/catalog?sort=discount"
            className="text-xs font-bold text-[#E31837] hover:underline flex items-center gap-1"
          >
            Explore All Trending <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 6 Cards per row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-3.5">
          {trendingProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* ================= PROMOTIONAL MULTI-BANNERS (Bank / Fashion / Express Grocery) ================= */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PROMO_BANNERS.map((promo) => (
            <div
              key={promo.id}
              className={`rounded-xl p-5 bg-gradient-to-r ${promo.bgGradient} text-white shadow-card flex flex-col justify-between min-h-[170px] relative overflow-hidden`}
            >
              <div className="relative z-10 space-y-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/25">
                  {promo.tag}
                </span>
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white leading-snug">
                  {promo.title}
                </h3>
                <p className="text-xs text-white/80 line-clamp-2">
                  {promo.subtitle}
                </p>
              </div>

              <div className="relative z-10 pt-3">
                <Link
                  to={promo.link}
                  className="inline-flex items-center gap-1.5 text-xs font-black px-3.5 py-1.5 rounded-lg bg-white text-[#222222] hover:bg-gray-100 shadow-sm transition-all"
                >
                  <span>{promo.cta}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#E31837]" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= 6. FASHION & LIFESTYLE ================= */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-[#222222] tracking-tight">
                Fashion & Lifestyle
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-100 text-pink-700 uppercase">
                Men's • Women's • Footwear • Bags
              </span>
            </div>
            <p className="text-xs text-[#777777]">Premium apparel, denim jackets, ethnic suits, sneakers, and handbags</p>
          </div>
          <Link
            to="/catalog?category=fashion"
            className="text-xs font-bold text-[#E31837] hover:underline flex items-center gap-1"
          >
            View All Fashion <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-3.5">
          {fashionProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* ================= 7. ELECTRONICS & GADGETS ================= */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-[#222222] tracking-tight">
                Electronics & Gadgets
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">
                Flagships & Audio
              </span>
            </div>
            <p className="text-xs text-[#777777]">Flagship 5G smartphones, laptops, ANC headphones, smartwatches, and 4K TVs</p>
          </div>
          <Link
            to="/catalog?category=electronics"
            className="text-xs font-bold text-[#E31837] hover:underline flex items-center gap-1"
          >
            View All Electronics <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-3.5">
          {electronicsProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* ================= 8. HOME & KITCHEN ESSENTIALS ================= */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-[#222222] tracking-tight">
                Home & Kitchen Essentials
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                Appliances & Decor
              </span>
            </div>
            <p className="text-xs text-[#777777]">Air fryers, espresso machines, cookware sets, ergonomic chairs, and ambient lamps</p>
          </div>
          <Link
            to="/catalog?category=home-kitchen"
            className="text-xs font-bold text-[#E31837] hover:underline flex items-center gap-1"
          >
            View Home & Kitchen <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-3.5">
          {homeProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* ================= 9. BEAUTY & PERSONAL CARE ================= */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-[#222222] tracking-tight">
                Beauty & Personal Care
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 uppercase">
                Glow & Wellness
              </span>
            </div>
            <p className="text-xs text-[#777777]">Dermatological skincare serums, luxury fragrances, makeup, and hair stylers</p>
          </div>
          <Link
            to="/catalog?category=beauty"
            className="text-xs font-bold text-[#E31837] hover:underline flex items-center gap-1"
          >
            View All Beauty <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-3.5">
          {beautyProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* ================= 10. GROCERY & DAILY ESSENTIALS ================= */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-[#222222] tracking-tight">
                Grocery & Daily Essentials
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                Farm Fresh & Pantry
              </span>
            </div>
            <p className="text-xs text-[#777777]">Cold-pressed olive oils, organic almonds, whole bean coffee, and pantry staples</p>
          </div>
          <Link
            to="/catalog?category=grocery"
            className="text-xs font-bold text-[#E31837] hover:underline flex items-center gap-1"
          >
            View All Grocery <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-3.5">
          {groceryProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* ================= 11. SPORTS & FITNESS ================= */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-[#222222] tracking-tight">
                Sports & Fitness
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 uppercase">
                Active Living
              </span>
            </div>
            <p className="text-xs text-[#777777]">Adjustable dumbbells, yoga mats, whey isolate, rackets, and athletic gear</p>
          </div>
          <Link
            to="/catalog?category=sports"
            className="text-xs font-bold text-[#E31837] hover:underline flex items-center gap-1"
          >
            View Sports Gear <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-3.5">
          {sportsProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* ================= 12. NEW ARRIVALS ACROSS DEPARTMENTS ================= */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-[#222222] tracking-tight">
                New Arrivals
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E31837] text-white uppercase">
                Fresh Releases
              </span>
            </div>
            <p className="text-xs text-[#777777]">Fresh launches in tech, fashion, toys, home decor, and automotive</p>
          </div>
          <Link
            to="/catalog?sort=newest"
            className="text-xs font-bold text-[#E31837] hover:underline flex items-center gap-1"
          >
            Explore All New Arrivals <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-3.5">
          {newArrivals.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* ================= 13. TOP BRANDS (Multi-Category Brands) ================= */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-xl border border-[#E8E8E8] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#222222] tracking-tight">
                  Top Marketplace Brands
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 uppercase">
                  100% Genuine
                </span>
              </div>
              <p className="text-xs text-[#777777]">Shop official brand stores with manufacturer warranties</p>
            </div>
            <Link
              to="/catalog"
              className="text-xs font-bold text-[#E31837] hover:underline flex items-center gap-1"
            >
              View All Brands <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {TOP_BRANDS.map((brand) => (
              <Link
                key={brand.name}
                to={`/catalog?brand=${encodeURIComponent(brand.name)}`}
                className="group p-3.5 rounded-xl border border-[#E8E8E8] hover:border-[#E31837]/50 text-center flex flex-col items-center justify-center hover:bg-[#FDF2F4] transition-all bg-white shadow-xs"
              >
                <div className="w-14 h-14 rounded-xl bg-gray-50 group-hover:bg-white border border-gray-100 flex items-center justify-center p-2.5 shadow-xs transition-all mb-2.5">
                  {brand.logo ? (
                    <img
                      src={brand.logo}
                      alt={`${brand.name} logo`}
                      className="max-h-full max-w-full object-contain filter group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <span
                    style={{ display: brand.logo ? 'none' : 'flex' }}
                    className="w-full h-full items-center justify-center font-black text-sm text-[#222222] group-hover:text-[#E31837]"
                  >
                    {brand.name[0]}
                  </span>
                </div>
                <span className="text-xs font-bold text-[#222222] group-hover:text-[#E31837] transition-colors truncate w-full">
                  {brand.name}
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5">{brand.tag}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 14. RECOMMENDED FOR YOU (Personalized Multi-Category Picks) ================= */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-[#222222] tracking-tight">
                Recommended For You
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#252525] text-white uppercase">
                Curated
              </span>
            </div>
            <p className="text-xs text-[#777777]">Personalized selections tailored across all shopping categories</p>
          </div>
          <Link
            to="/catalog?sort=featured"
            className="text-xs font-bold text-[#E31837] hover:underline flex items-center gap-1"
          >
            Explore Recommendations <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-3.5">
          {recommendedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* ================= CUSTOMER BENEFITS BAR ================= */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CUSTOMER_BENEFITS.map((b, idx) => {
            const Icon =
              idx === 0 ? Truck : idx === 1 ? ShieldCheck : idx === 2 ? RotateCcw : Headphones;

            return (
              <div
                key={b.title}
                className="bg-white rounded-xl border border-[#E8E8E8] p-4 flex items-center gap-3.5 shadow-xs"
              >
                <div className="w-11 h-11 rounded-lg bg-[#FDF2F4] text-[#E31837] flex items-center justify-center shrink-0">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#222222]">{b.title}</h4>
                  <p className="text-[11px] text-[#777777] leading-snug mt-0.5">{b.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= NEWSLETTER SUBSCRIPTION ================= */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="bg-[#252525] text-white rounded-2xl p-6 sm:p-10 shadow-card">
          <div className="max-w-2xl mx-auto text-center space-y-4">

            <h3 className="text-xl sm:text-3xl font-black tracking-tight text-white">
              Your World. One Marketplace.
            </h3>

            <p className="text-xs sm:text-sm text-gray-400">
              Subscribe to get secret flash deal notifications, early-access festive discounts, and use coupon code <strong className="text-red-400">WELCOME500</strong> for a flat ₹500 discount on your order.
            </p>

            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row items-center gap-2 pt-2 max-w-md mx-auto">
              <input
                type="email"
                required
                value={emailSub}
                onChange={(e) => {
                  setEmailSub(e.target.value);
                  setSubError('');
                }}
                placeholder="Enter your email address..."
                className="w-full px-4 py-3 rounded-xl bg-white text-[#222222] text-xs font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E31837]"
              />
              <button
                type="submit"
                disabled={subLoading}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#E31837] hover:bg-[#C7122E] disabled:opacity-60 text-white font-bold text-xs whitespace-nowrap shadow-md transition-colors"
              >
                {subLoading ? 'Subscribing...' : 'Join & Save ₹500'}
              </button>
            </form>

            {subSuccess && (
              <p className="text-xs font-bold text-emerald-400 animate-fadeIn">
                ✓ {subMessage || 'Subscribed! Use promo code WELCOME500 at checkout for flat ₹500 off.'}
              </p>
            )}

            {subError && (
              <p className="text-xs font-bold text-rose-400 animate-fadeIn">
                ✗ {subError}
              </p>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}
