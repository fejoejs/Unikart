import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore, useWishlistStore, useUIStore } from '../store/useStore';
import { Star, Heart, ShoppingCart, Eye, Images } from 'lucide-react';
import { NO_IMAGE_PLACEHOLDER } from '../data/appConfig';

export default function ProductCard({ product }) {
  const navigate = useNavigate();
  const { addToCart } = useCartStore();
  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const { openCartDrawer, setQuickViewProduct, addToast } = useUIStore();
  const [isHovered, setIsHovered] = useState(false);

  const inWishlist = isInWishlist(product.id);

  // Normalized list of images for multi-image support
  const images = (Array.isArray(product.images) && product.images.length > 0)
    ? product.images
    : (Array.isArray(product.gallery) && product.gallery.length > 0)
      ? product.gallery
      : [product.image].filter(Boolean);

  const primaryImage = images[0] || product.image || NO_IMAGE_PLACEHOLDER;
  const secondaryImage = images.length > 1 ? images[1] : primaryImage;
  const currentImage = isHovered && images.length > 1 ? secondaryImage : primaryImage;

  const handleCardClick = () => {
    navigate(`/product/${product.id}`);
  };

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    try {
      const res = await addToCart(product, 1);
      if (res && res.success) {
        addToast(`${product.name} added to cart!`, 'success');
      } else {
        addToast(res?.error || 'Failed to add item to cart.', 'error');
      }
    } catch (err) {
      addToast(err.response?.data?.detail || err.message || 'Failed to add item to cart.', 'error');
    }
  };

  const handleWishlistToggle = async (e) => {
    e.stopPropagation();
    try {
      const added = await toggleWishlist(product);
      addToast(
        added ? `${product.name} added to Wishlist` : `${product.name} removed from Wishlist`,
        added ? 'success' : 'info'
      );
    } catch (err) {
      addToast('Could not update wishlist.', 'error');
    }
  };

  const handleQuickView = (e) => {
    e.stopPropagation();
    setQuickViewProduct(product);
  };

  return (
    <div
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group bg-white rounded-xl border border-[#E8E8E8] hover:border-[#E31837]/40 shadow-xs hover:shadow-hover transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer relative"
    >
      {/* 1. Media Area - Strict Uniform Dimensions (1:1 Square Container Across All Cards) */}
      <div className="relative w-full aspect-square bg-[#F8F9FA] overflow-hidden border-b border-[#F0F0F0]">
        <img
          src={currentImage}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            if (e.currentTarget.src !== NO_IMAGE_PLACEHOLDER) {
              e.currentTarget.src = NO_IMAGE_PLACEHOLDER;
            }
          }}
        />

        {/* Small Promotional Badge (Top Left) */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start z-10 pointer-events-none">
          {product.discount > 0 ? (
            <span className="bg-[#E31837] text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow-xs tracking-tight">
              -{product.discount}%
            </span>
          ) : product.badge ? (
            <span className="bg-[#252525] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
              {product.badge}
            </span>
          ) : null}
        </div>

        {/* Multi-Image Indicator Pill (Bottom Left) */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-2 z-10 bg-black/75 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs pointer-events-none">
            <Images className="w-2.5 h-2.5" />
            <span>{images.length}</span>
          </div>
        )}

        {/* Wishlist Button (Top Right) */}
        <button
          type="button"
          onClick={handleWishlistToggle}
          className={`absolute top-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
            inWishlist
              ? 'bg-[#FDF2F4] text-[#E31837] shadow-xs border border-[#E31837]/30'
              : 'bg-white/90 text-gray-400 hover:text-[#E31837] hover:bg-white shadow-xs border border-gray-200'
          }`}
          title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart className={`w-3.5 h-3.5 ${inWishlist ? 'fill-[#E31837]' : ''}`} />
        </button>

        {/* Quick View Floating Action (on hover) */}
        <div className="absolute inset-x-3 bottom-2 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <button
            type="button"
            onClick={handleQuickView}
            className="w-full py-1 px-2 rounded-md bg-white text-gray-700 hover:text-[#E31837] hover:bg-white text-[11px] font-bold shadow-md border border-gray-200 flex items-center justify-center gap-1 transition-all"
          >
            <Eye className="w-3 h-3" /> Quick View
          </button>
        </div>
      </div>

      {/* 2. Content Details Area */}
      <div className="p-3 sm:p-3.5 flex flex-col flex-1 justify-between gap-2.5">
        <div className="space-y-1">
          {/* Brand Name */}
          <p className="text-[11px] font-semibold text-[#777777] uppercase tracking-wider">
            {product.brand}
          </p>

          {/* Product Title (2-Line Clamp) */}
          <h3 className="text-xs sm:text-[13px] font-semibold text-[#222222] line-clamp-2 leading-snug group-hover:text-[#E31837] transition-colors min-h-[2.5rem]">
            {product.name}
          </h3>

          {/* Rating Stars & Count */}
          {(() => {
            const reviewCount = product.reviewCount ?? product.review_count ?? 0;
            const ratingVal = typeof product.rating === 'number' && product.rating > 0 ? product.rating : null;
            if (reviewCount > 0 && ratingVal) {
              return (
                <div className="flex items-center gap-1 pt-0.5">
                  <div className="flex items-center text-amber-400">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  </div>
                  <span className="text-xs font-bold text-[#222222]">{ratingVal.toFixed(1)}</span>
                  <span className="text-[11px] text-[#777777]">({reviewCount.toLocaleString()})</span>
                </div>
              );
            }
            return (
              <div className="flex items-center gap-1 pt-0.5 text-[11px] text-gray-400">
                <Star className="w-3 h-3 text-gray-300" />
                <span>No reviews yet</span>
              </div>
            );
          })()}
        </div>

        {/* Price & Add to Cart Action */}
        <div className="pt-1.5 border-t border-[#F0F0F0] space-y-2">
          {/* Prices */}
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-sm sm:text-base font-black text-[#E31837] tracking-tight">
              ₹{product.price.toLocaleString('en-IN')}
            </span>
            {product.originalPrice > product.price && (
              <span className="text-xs text-[#777777] line-through">
                ₹{product.originalPrice.toLocaleString('en-IN')}
              </span>
            )}
          </div>

          {/* Add to Cart Red Button */}
          <button
            type="button"
            onClick={handleAddToCart}
            className="w-full py-1.5 px-3 rounded-lg bg-[#E31837] hover:bg-[#C7122E] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Add to Cart</span>
          </button>
        </div>
      </div>
    </div>
  );
}
