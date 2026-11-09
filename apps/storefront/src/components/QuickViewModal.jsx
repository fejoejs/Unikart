import { NO_IMAGE_PLACEHOLDER } from "../data/appConfig";
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore, useCartStore, useWishlistStore } from '../store/useStore';
import { X, Star, Heart, ShoppingCart, Check, ShieldCheck, ArrowRight, Zap } from 'lucide-react';

export default function QuickViewModal() {
  const { quickViewProduct, closeQuickView, openCartDrawer, addToast } = useUIStore();
  const { addToCart } = useCartStore();
  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const navigate = useNavigate();

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);

  if (!quickViewProduct) return null;

  const product = quickViewProduct;
  const gallery = (Array.isArray(product.images) && product.images.length > 0)
    ? product.images
    : (Array.isArray(product.gallery) && product.gallery.length > 0)
      ? product.gallery
      : [product.image].filter(Boolean);

  const activeColor = selectedColor || (product.colors && product.colors[0]) || '';
  const activeSize = selectedSize || (product.sizes && product.sizes[0]) || '';
  const inWishlist = isInWishlist(product.id);

  const handleAddToCart = async () => {
    try {
      const res = await addToCart(
        {
          ...product,
          color: activeColor,
          size: activeSize
        },
        quantity
      );
      if (res && res.success) {
        addToast(`${product.name} added to cart!`, 'success');
        closeQuickView();
        openCartDrawer();
      } else {
        addToast(res?.error || 'Failed to add item to cart.', 'error');
      }
    } catch (err) {
      addToast(err.response?.data?.detail || err.message || 'Failed to add item to cart.', 'error');
    }
  };

  const handleWishlistClick = async () => {
    const added = await toggleWishlist(product);
    addToast(added ? 'Added to Wishlist' : 'Removed from Wishlist', added ? 'success' : 'info');
  };

  const handleViewFullPage = () => {
    closeQuickView();
    navigate(`/product/${product.id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn" onClick={(e) => { if (e.target === e.currentTarget) closeQuickView(); }} role="dialog" aria-modal="true" aria-labelledby="quickview-title">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden relative animate-scaleUp max-h-[90vh] flex flex-col md:flex-row">
        {/* Close Button */}
        <button
          type="button"
          onClick={closeQuickView}
          className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Left: Product Imagery */}
        <div className="w-full md:w-1/2 p-6 bg-white flex flex-col justify-between border-b md:border-b-0 md:border-r border-gray-100">
          <div className="aspect-square w-full rounded-lg overflow-hidden bg-[#F8F9FA] border border-gray-100 p-4 relative mb-3 flex items-center justify-center">
            <img
              src={gallery[selectedImage] || product.image || NO_IMAGE_PLACEHOLDER}
              onError={(e) => { e.currentTarget.src = NO_IMAGE_PLACEHOLDER; }}
              alt={product.name}
              className="w-full h-full object-contain"
            />
            {product.discount > 0 && (
              <span className="absolute top-2.5 left-2.5 bg-[#E31837] text-white text-[11px] font-black px-2 py-0.5 rounded shadow-xs">
                {product.discount}% OFF
              </span>
            )}
          </div>

          {/* Thumbnails */}
          {gallery.length > 1 && (
            <div className="flex gap-2 justify-center overflow-x-auto py-1">
              {gallery.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImage(idx)}
                  className={`w-12 h-12 rounded-lg p-1 border-2 bg-white transition-all cursor-pointer shrink-0 ${
                    selectedImage === idx ? 'border-[#E31837]' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img src={img || NO_IMAGE_PLACEHOLDER} alt="" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.src = NO_IMAGE_PLACEHOLDER; }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Info & Actions */}
        <div className="w-full md:w-1/2 p-6 flex flex-col justify-between space-y-4 overflow-y-auto">
          <div className="space-y-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {product.brand} &bull; {product.categoryLabel || product.category}
              </span>
              <h2 id="quickview-title" className="text-base sm:text-lg font-black text-[#222222] leading-snug mt-0.5">
                {product.name}
              </h2>
            </div>

            {/* Rating */}
            {(() => {
              const reviewCount = product.reviewCount ?? product.review_count ?? 0;
              const ratingVal = typeof product.rating === 'number' && product.rating > 0 ? product.rating : null;
              if (reviewCount > 0 && ratingVal) {
                return (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-[#252525] text-white px-2 py-0.5 rounded text-xs font-bold">
                      <span>{ratingVal.toFixed(1)}</span>
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    </div>
                    <span className="text-xs text-gray-500">
                      ({reviewCount.toLocaleString()} verified {reviewCount === 1 ? 'review' : 'reviews'})
                    </span>
                  </div>
                );
              }
              return (
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Star className="w-3.5 h-3.5 text-gray-300" />
                  <span>No reviews yet</span>
                </div>
              );
            })()}

            {/* Price */}
            <div className="flex items-baseline gap-2 pt-1 border-t border-gray-100">
              <span className="text-xl sm:text-2xl font-black text-[#E31837]">
                ₹{product.price.toLocaleString('en-IN')}
              </span>
              {product.originalPrice > product.price && (
                <span className="text-sm text-gray-400 line-through">
                  ₹{product.originalPrice.toLocaleString('en-IN')}
                </span>
              )}
            </div>

            {/* Stock status */}
            <div className="text-xs">
              <span className={`inline-flex items-center gap-1.5 font-bold px-2 py-0.5 rounded ${product.stock > 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                {product.stock > 0 ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                <span>{product.stock > 0 ? `In Stock (${product.stock} units available)` : 'Out of Stock'}</span>
              </span>
            </div>

            {/* Key Features Bullets */}
            {product.features && (
              <ul className="text-xs text-gray-600 space-y-1 pt-1 list-disc list-inside">
                {product.features.slice(0, 3).map((f, i) => (
                  <li key={i} className="truncate">{f}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-3 border-t border-gray-100">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddToCart}
                className="flex-1 py-2.5 px-4 rounded-lg bg-[#E31837] hover:bg-[#C7122E] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Add to Cart</span>
              </button>
              <button
                type="button"
                onClick={handleWishlistClick}
                className={`p-2.5 rounded-lg border transition-colors cursor-pointer ${
                  inWishlist
                    ? 'border-[#E31837] bg-red-50 text-[#E31837]'
                    : 'border-gray-200 text-gray-400 hover:text-[#E31837] hover:border-gray-300'
                }`}
                title="Wishlist"
              >
                <Heart className={`w-4 h-4 ${inWishlist ? 'fill-[#E31837]' : ''}`} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleViewFullPage}
              className="w-full py-2 px-3 text-center text-xs font-bold text-gray-600 hover:text-[#E31837] flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <span>View Full Product Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
