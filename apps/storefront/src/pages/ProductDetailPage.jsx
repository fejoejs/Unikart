import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { PINCODES, NO_IMAGE_PLACEHOLDER } from '../data/appConfig';
import {
  useCartStore,
  useWishlistStore,
  useUIStore,
  useLocationStore,
  useCatalogStore,
  useAuthStore
} from '../store/useStore';
import ProductCard from '../components/ProductCard';
import NotFoundPage from '../components/ui/NotFoundPage';
import {
  Star,
  Heart,
  ShoppingCart,
  Zap,
  Truck,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  ChevronRight,
  Share2,
  Store,
  Plus,
  Minus,
  MessageSquare,
  ThumbsUp,
  X,
  Check,
  AlertCircle
} from 'lucide-react';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { addToCart } = useCartStore();
  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const { openCartDrawer, addToast } = useUIStore();
  const { pincode: defaultPincode, city: defaultCity } = useLocationStore();

  const { products: catalogProducts, loading: catalogLoading } = useCatalogStore();
  const allCatalogProducts = catalogProducts || [];

  // Match product accurately by SKU string, ID, or slug without arbitrary fallback
  const product = useMemo(() => {
    return allCatalogProducts.find(
      (p) => String(p.id) === String(id) || String(p.productId) === String(id) || p.slug === id
    ) || null;
  }, [allCatalogProducts, id]);

  // Gallery and Variant State - ALL Hooks declared unconditionally at top
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [pincodeInput, setPincodeInput] = useState(defaultPincode);
  const [pincodeStatus, setPincodeStatus] = useState({
    verified: true,
    city: defaultCity,
    sla: 'Tomorrow by 2:00 PM'
  });

  // Real Customer Reviews State
  const { user } = useAuthStore();
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewAuthor, setReviewAuthor] = useState(user?.name || '');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (user?.name) {
      setReviewAuthor(user.name);
    }
  }, [user]);

  useEffect(() => {
    if (product?.id) {
      setReviewsLoading(true);
      api.get(`/products/${product.id}/reviews`)
        .then((res) => {
          if (Array.isArray(res.data)) {
            setReviews(res.data);
          }
        })
        .catch(() => {})
        .finally(() => setReviewsLoading(false));
    }
  }, [product?.id]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewTitle.trim() || !reviewComment.trim()) {
      addToast('Please provide a title and comments for your review.', 'error');
      return;
    }
    setSubmittingReview(true);
    try {
      await api.post(`/products/${product.id}/reviews`, {
        rating: reviewRating,
        title: reviewTitle.trim(),
        comment: reviewComment.trim(),
        author_name: reviewAuthor.trim() || user?.name || 'Verified Customer'
      });
      addToast('Review submitted successfully!', 'success');
      setReviewFormOpen(false);
      setReviewTitle('');
      setReviewComment('');
      const updated = await api.get(`/products/${product.id}/reviews`);
      if (Array.isArray(updated.data)) setReviews(updated.data);
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to submit review.', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Re-sync options when product changes
  useEffect(() => {
    if (product) {
      if (Array.isArray(product.colors) && product.colors.length > 0) {
        setSelectedColor(product.colors[0]);
      } else {
        setSelectedColor('');
      }
      if (Array.isArray(product.sizes) && product.sizes.length > 0) {
        setSelectedSize(product.sizes[0]);
      } else {
        setSelectedSize('');
      }
      setSelectedImage(0);
      setQuantity(1);
    }
  }, [product?.id, product?.productId]);

  // Map selected color and size to active variant with fallback to primary variant
  const activeVariant = useMemo(() => {
    if (!product || !Array.isArray(product.variants) || product.variants.length === 0) {
      return null;
    }
    const match = product.variants.find((v) => {
      const matchColor = !selectedColor || selectedColor === 'Default' || v.color === selectedColor;
      const matchSize = !selectedSize || selectedSize === 'Standard' || v.storage === selectedSize;
      return matchColor && matchSize;
    });
    return match || product.variants[0] || null;
  }, [product, selectedColor, selectedSize]);

  // Normalized gallery
  const gallery = useMemo(() => {
    if (!product) return [];
    if (Array.isArray(product.images) && product.images.length > 0) return product.images;
    if (Array.isArray(product.gallery) && product.gallery.length > 0) return product.gallery;
    return [product.image].filter(Boolean);
  }, [product]);

  const inWishlist = product ? isInWishlist(product.id) : false;

  const currentPrice = activeVariant?.price ?? product?.price ?? 0;
  const currentOriginalPrice = activeVariant?.originalPrice ?? product?.originalPrice ?? currentPrice;
  const currentDiscount = currentOriginalPrice > currentPrice
    ? Math.round(((currentOriginalPrice - currentPrice) / currentOriginalPrice) * 100)
    : 0;
  const currentStock = activeVariant?.stock ?? product?.stock ?? 0;
  const isVariantConfigValid = Boolean(activeVariant);
  const isAvailable = Boolean(activeVariant && currentStock > 0);
  const activeVariantId = activeVariant?.id ?? product?.variantId;

  const handlePincodeCheck = (e) => {
    e.preventDefault();
    const pin = pincodeInput.trim();
    if (PINCODES[pin]) {
      const info = PINCODES[pin];
      setPincodeStatus({
        verified: true,
        city: info.city,
        sla: info.slaHours <= 2 ? 'Today in 2 Hours' : 'Tomorrow by 2:00 PM'
      });
      addToast(`Deliverable to ${info.city}!`, 'success');
    } else if (pin.length === 6) {
      setPincodeStatus({
        verified: true,
        city: 'Verified Location',
        sla: '2 - 3 Business Days'
      });
      addToast('Standard delivery available.', 'info');
    } else {
      addToast('Please enter a valid 6-digit postal code.', 'error');
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    if (!isAvailable) {
      addToast('This variant is currently out of stock.', 'error');
      return;
    }
    try {
      const result = await addToCart(
        {
          ...product,
          variantId: activeVariantId,
          price: currentPrice,
          originalPrice: currentOriginalPrice,
          stock: currentStock,
          color: selectedColor,
          size: selectedSize
        },
        quantity,
        selectedColor,
        selectedSize
      );
      if (result && result.success) {
        addToast(`${product.name} (${quantity}) added to cart!`, 'success');
        openCartDrawer();
      } else {
        addToast(result?.error || 'Failed to add item to cart.', 'error');
      }
    } catch (err) {
      addToast(err.response?.data?.detail || err.message || 'Failed to add item to cart.', 'error');
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    if (!isAvailable) {
      addToast('This variant is currently out of stock.', 'error');
      return;
    }
    const result = await addToCart(
      {
        ...product,
        variantId: activeVariantId,
        price: currentPrice,
        originalPrice: currentOriginalPrice,
        stock: currentStock,
        color: selectedColor,
        size: selectedSize
      },
      quantity,
      selectedColor,
      selectedSize
    );
    if (result && result.success) {
      navigate('/checkout');
    } else {
      addToast(result?.error || 'Failed to proceed to checkout.', 'error');
    }
  };

  const handleWishlistToggle = async () => {
    if (!product) return;
    const added = await toggleWishlist(product);
    addToast(
      added ? `Added ${product.name} to Wishlist` : `Removed from Wishlist`,
      added ? 'success' : 'info'
    );
  };

  // Related products from the same category
  const relatedProducts = product
    ? allCatalogProducts.filter(
        (p) => p.category === product.category && p.id !== product.id
      ).slice(0, 6)
    : [];

  // Conditional returns AFTER all hooks are evaluated
  if (catalogLoading && !product) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-16 flex flex-col items-center justify-center text-center">
        <div className="w-10 h-10 border-3 border-[#E31837] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-600 text-sm font-medium">Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return <NotFoundPage />;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] py-4 sm:py-6">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 space-y-6">
        
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-1.5 text-xs text-[#777777] overflow-x-auto whitespace-nowrap">
          <Link to="/" className="hover:text-[#E31837] transition-colors">Home</Link>
          <span>/</span>
          <Link to="/catalog" className="hover:text-[#E31837] transition-colors">Marketplace</Link>
          <span>/</span>
          <Link to={`/catalog?category=${product.category}`} className="hover:text-[#E31837] transition-colors capitalize">
            {product.categoryLabel || product.category}
          </Link>
          <span>/</span>
          <span className="font-semibold text-[#222222] truncate max-w-xs">{product.name}</span>
        </nav>

        {/* Main Product Showcase Box */}
        <div className="bg-white rounded-xl border border-[#E8E8E8] p-4 sm:p-8 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Image Gallery */}
            <div className="lg:col-span-5 flex flex-col-reverse sm:flex-row gap-3">
              {/* Thumbnails list */}
              {gallery.length > 1 && (
                <div className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto sm:max-h-[440px] shrink-0">
                  {gallery.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImage(idx)}
                      className={`w-16 h-16 rounded-lg border-2 p-1 bg-white overflow-hidden transition-all shrink-0 ${
                        selectedImage === idx ? 'border-[#E31837]' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img src={img || NO_IMAGE_PLACEHOLDER} alt="" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.src = NO_IMAGE_PLACEHOLDER; }} />
                    </button>
                  ))}
                </div>
              )}

              {/* Large Main Image */}
              <div className="flex-1 bg-white rounded-xl border border-gray-100 p-6 flex items-center justify-center relative min-h-[360px] sm:min-h-[440px]">
                {product.discount > 0 && (
                  <span className="absolute top-3 left-3 bg-[#E31837] text-white text-xs font-black px-2 py-0.5 rounded shadow-xs">
                    {product.discount}% OFF
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleWishlistToggle}
                  className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                    inWishlist
                      ? 'bg-[#FDF2F4] text-[#E31837] border-[#E31837]/40 shadow-xs'
                      : 'bg-white text-gray-400 hover:text-[#E31837] border-gray-200 shadow-xs'
                  }`}
                  title={inWishlist ? 'Remove from wishlist' : 'Save to wishlist'}
                >
                  <Heart className={`w-4 h-4 ${inWishlist ? 'fill-[#E31837]' : ''}`} />
                </button>
                <img
                  src={gallery[selectedImage] || product.image || NO_IMAGE_PLACEHOLDER}
                  onError={(e) => { e.currentTarget.src = NO_IMAGE_PLACEHOLDER; }}
                  alt={product.name}
                  className="max-h-[380px] max-w-full object-contain"
                />
              </div>
            </div>

            {/* Right Column: Product Info & Buy Actions */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* Brand, Title & Rating */}
              <div className="space-y-1.5 border-b border-[#F0F0F0] pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#777777]">
                  {product.brand}
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-[#222222] tracking-tight leading-snug">
                  {product.name}
                </h1>

                {(() => {
                  const effectiveCount = reviews.length > 0 ? reviews.length : (product.reviewCount ?? product.review_count ?? 0);
                  const effectiveRating = reviews.length > 0
                    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length)
                    : (product.rating || 0);

                  if (effectiveCount > 0 && effectiveRating > 0) {
                    return (
                      <div className="flex items-center gap-3 pt-1">
                        <div className="flex items-center gap-1 bg-[#252525] text-white px-2 py-0.5 rounded text-xs font-bold">
                          <span>{effectiveRating.toFixed(1)}</span>
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        </div>
                        <span className="text-xs text-[#777777]">
                          {effectiveCount.toLocaleString()} {effectiveCount === 1 ? 'Rating & Review' : 'Ratings & Reviews'}
                        </span>
                        <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 100% Genuine Verified
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div className="flex items-center gap-3 pt-1">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-gray-300" />
                        <span>No reviews yet</span>
                      </span>
                      <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 100% Genuine Verified
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Pricing Section */}
              <div className="space-y-1">
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl sm:text-3xl font-black text-[#E31837] tracking-tight">
                    ₹{currentPrice.toLocaleString('en-IN')}
                  </span>
                  {currentOriginalPrice > currentPrice && (
                    <span className="text-sm sm:text-base text-[#777777] line-through">
                      ₹{currentOriginalPrice.toLocaleString('en-IN')}
                    </span>
                  )}
                  {currentDiscount > 0 && (
                    <span className="text-xs font-black text-[#E31837] bg-[#FDF2F4] px-2 py-0.5 rounded border border-[#E31837]/20">
                      Save ₹{(currentOriginalPrice - currentPrice).toLocaleString('en-IN')} ({currentDiscount}%)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#777777]">Inclusive of all taxes &bull; Free Shipping Available</p>
              </div>

              {/* Variants Selector */}
              {product.colors && product.colors.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-[#222222]">
                    Color: <span className="font-normal text-[#777777]">{selectedColor}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.colors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSelectedColor(c)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          selectedColor === c
                            ? 'border-[#E31837] bg-[#FDF2F4] text-[#E31837]'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {product.sizes && product.sizes.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-[#222222]">
                    Configuration / Storage: <span className="font-normal text-[#777777]">{selectedSize}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSelectedSize(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          selectedSize === s
                            ? 'border-[#E31837] bg-[#FDF2F4] text-[#E31837]'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity Selector & Action Buttons */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[#222222]">Quantity:</span>
                  <div className="flex items-center border border-gray-200 rounded-lg bg-white">
                    <button
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-black disabled:opacity-40"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-10 text-center font-bold text-xs text-[#222222]">{quantity}</span>
                    <button
                      type="button"
                      disabled={!isAvailable || quantity >= currentStock}
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-black disabled:opacity-40"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {isAvailable ? (
                    <span className="text-xs text-emerald-600 font-semibold">
                      In Stock ({currentStock} available) &bull; Ships Immediately
                    </span>
                  ) : !isVariantConfigValid ? (
                    <span className="text-xs text-amber-600 font-bold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Combination Unavailable
                    </span>
                  ) : (
                    <span className="text-xs text-rose-600 font-bold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Out of Stock
                    </span>
                  )}
                </div>

                {/* Primary Add to Cart and Buy Now */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md lg:max-w-none">
                  <button
                    type="button"
                    disabled={!isAvailable}
                    onClick={handleAddToCart}
                    className="py-3 px-5 rounded-xl bg-[#E31837] hover:bg-[#C7122E] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>
                      {isAvailable
                        ? 'Add to Cart'
                        : !isVariantConfigValid
                        ? 'Combination Unavailable'
                        : 'Out of Stock'}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={!isAvailable}
                    onClick={handleBuyNow}
                    className="py-3 px-5 rounded-xl bg-[#252525] hover:bg-[#1C1C1C] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>
                      {isAvailable
                        ? 'Buy Now'
                        : !isVariantConfigValid
                        ? 'Unavailable'
                        : 'Out of Stock'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Pincode SLA Checker */}
              <div className="pt-3 border-t border-[#F0F0F0] space-y-2 max-w-md">
                <span className="text-xs font-bold text-[#222222] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#E31837]" /> Check Delivery Availability (Estimated SLA)
                </span>
                <form onSubmit={handlePincodeCheck} className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={pincodeInput}
                    onChange={(e) => setPincodeInput(e.target.value)}
                    placeholder="Enter 6-digit Pincode"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs font-mono font-medium focus:outline-none focus:ring-1 focus:ring-[#E31837]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#252525] hover:bg-[#1C1C1C] text-white text-xs font-bold shrink-0 transition-colors"
                  >
                    Check
                  </button>
                </form>

                {pincodeStatus.verified && (
                  <p className="text-xs text-gray-700 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      Delivery to <strong className="text-[#222222]">{pincodeStatus.city}</strong> by{' '}
                      <strong className="text-[#E31837]">{pincodeStatus.sla}</strong>
                    </span>
                  </p>
                )}
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#F0F0F0] text-center text-[11px] text-[#777777]">
                <div className="p-2 rounded-lg bg-gray-50 flex flex-col items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-[#222222]">Brand Warranty</span>
                </div>
                <div className="p-2 rounded-lg bg-gray-50 flex flex-col items-center gap-1">
                  <RotateCcw className="w-4 h-4 text-[#E31837]" />
                  <span className="font-semibold text-[#222222]">7-Day Replacement</span>
                </div>
                <div className="p-2 rounded-lg bg-gray-50 flex flex-col items-center gap-1">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-[#222222]">Fast Free Shipping</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Technical Specifications & Description */}
        <div className="bg-white rounded-xl border border-[#E8E8E8] p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-[#222222] pb-2 border-b border-[#F0F0F0]">
              Product Overview & Description
            </h3>
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed pt-3">
              {product.description}
            </p>
          </div>

          {product.features && product.features.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#777777] mb-2">
                Key Highlights
              </h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-700">
                {product.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#E31837] shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {product.specs && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#777777] mb-3">
                Technical Specifications
              </h4>
              <div className="border border-[#E8E8E8] rounded-lg overflow-hidden divide-y divide-[#E8E8E8] text-xs">
                {Object.entries(product.specs).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-1 sm:grid-cols-3 p-3">
                    <span className="font-semibold text-gray-500">{k}</span>
                    <span className="sm:col-span-2 text-gray-800 font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Customer Reviews & Feedback Section */}
        <div className="bg-white rounded-xl border border-[#E8E8E8] p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#F0F0F0] gap-4">
            <div>
              <h3 className="text-base font-bold text-[#222222]">
                Customer Ratings & Reviews
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Authentic buyer feedback recorded on UNIKART
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReviewFormOpen(!reviewFormOpen)}
              className="px-4 py-2 rounded-xl bg-[#252525] hover:bg-[#1a1a1a] text-white text-xs font-bold transition-all self-start sm:self-auto cursor-pointer"
            >
              {reviewFormOpen ? 'Cancel Review' : 'Write a Review'}
            </button>
          </div>

          {/* Write Review Form */}
          {reviewFormOpen && (
            <form onSubmit={handleReviewSubmit} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
              <h4 className="text-xs font-bold text-gray-800">Submit Your Review</h4>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-700">Rating:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= reviewRating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-xs font-bold text-gray-700 ml-2">{reviewRating} / 5</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Your Name (e.g. Rahul S.)"
                  value={reviewAuthor}
                  onChange={(e) => setReviewAuthor(e.target.value)}
                  className="px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white"
                />
                <input
                  type="text"
                  required
                  placeholder="Headline / Summary (e.g. Excellent build quality!)"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  className="px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white"
                />
              </div>

              <textarea
                required
                rows={3}
                placeholder="Share details of your own experience with this product..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white"
              />

              <button
                type="submit"
                disabled={submittingReview}
                className="px-5 py-2 rounded-lg bg-[#E31837] hover:bg-[#C7122E] text-white text-xs font-bold disabled:opacity-60 cursor-pointer"
              >
                {submittingReview ? 'Submitting...' : 'Post Verified Review'}
              </button>
            </form>
          )}

          {/* Reviews List */}
          {reviewsLoading ? (
            <div className="py-8 text-center text-xs text-gray-500">Loading reviews...</div>
          ) : reviews.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <MessageSquare className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="text-xs text-gray-500 font-semibold">No reviews yet for this product.</p>
              <p className="text-[11px] text-gray-400">Be the first to share your thoughts with other customers!</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F0F0F0] space-y-4">
              {reviews.map((rev) => (
                <div key={rev.id} className="pt-4 first:pt-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-[#252525] text-white px-2 py-0.5 rounded text-[10px] font-bold">
                        <span>{rev.rating}</span>
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                      </div>
                      <span className="text-xs font-bold text-[#222222]">{rev.title}</span>
                    </div>
                    {rev.created_at && (
                      <span className="text-[10px] text-gray-400">
                        {new Date(rev.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">{rev.comment}</p>
                  <div className="flex items-center gap-2 text-[11px] text-gray-500">
                    <span className="font-semibold text-gray-700">{rev.author_name}</span>
                    {rev.is_verified_purchase && (
                      <span className="text-emerald-600 font-bold flex items-center gap-1 text-[10px]">
                        <CheckCircle2 className="w-3 h-3" /> Verified Purchase
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Related Products Carousel */}
        {relatedProducts.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#222222] tracking-tight">
                Customers Also Viewed
              </h3>
              <Link
                to={`/catalog?category=${product.category}`}
                className="text-xs font-bold text-[#E31837] hover:underline"
              >
                View Category &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-3.5">
              {relatedProducts.map((rel) => (
                <ProductCard key={rel.id} product={rel} />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
