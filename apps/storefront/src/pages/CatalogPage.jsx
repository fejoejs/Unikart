import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useCatalogStore } from '../store/useStore';
import ProductCard from '../components/ProductCard';
import { NAV_CATEGORIES } from '../data/appConfig';
import {
  Filter,
  SlidersHorizontal,
  ChevronDown,
  X,
  Star,
  RotateCcw,
  Check,
  Flame,
  ArrowRight
} from 'lucide-react';

const ELECTRONICS_SLUGS = [
  'electronics',
  'smartphones',
  'laptops',
  'audio',
  'tablets',
  'gaming',
  'accessories',
  'tv-home',
  'cameras',
  'wearables',
  'appliances',
  'smart-home',
  'networking',
  'storage',
  'computer-peripherals'
];

export default function CatalogPage() {
  const { products: catalogProducts } = useCatalogStore();
  const allCatalogProducts = catalogProducts || [];
  const [searchParams, setSearchParams] = useSearchParams();

  // Search parameters from URL
  const queryParam = searchParams.get('q') || searchParams.get('search') || '';
  const categoryParam = searchParams.get('category') || '';
  const dealsParam = searchParams.get('deals') === 'true';
  const brandParam = searchParams.get('brand') || '';

  // Filter States
  const [selectedCategories, setSelectedCategories] = useState(
    categoryParam && categoryParam !== 'all' ? [categoryParam] : []
  );
  const [selectedBrands, setSelectedBrands] = useState(
    brandParam ? [brandParam] : []
  );
  const [minRating, setMinRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState(250000);
  const [minDiscount, setMinDiscount] = useState(dealsParam ? 10 : 0);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortBy, setSortBy] = useState('featured');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Sync state if URL search params change
  useEffect(() => {
    if (categoryParam && categoryParam !== 'all') {
      setSelectedCategories([categoryParam]);
    } else {
      setSelectedCategories([]);
    }
    if (brandParam) {
      setSelectedBrands([brandParam]);
    } else {
      setSelectedBrands([]);
    }
    if (dealsParam) {
      setMinDiscount(10);
    } else {
      setMinDiscount(0);
    }
  }, [categoryParam, brandParam, dealsParam]);

  // Available Brands extracted dynamically from live catalog
  const allBrands = useMemo(() => {
    return Array.from(new Set(allCatalogProducts.map((p) => p.brand))).filter(Boolean).sort();
  }, [allCatalogProducts]);

  // Available Categories with dynamic product count
  const categoryList = useMemo(() => {
    const counts = {};
    allCatalogProducts.forEach((p) => {
      const catKey = (p.category || '').toLowerCase();
      if (catKey) {
        counts[catKey] = (counts[catKey] || 0) + 1;
        if (ELECTRONICS_SLUGS.includes(catKey)) {
          counts['electronics'] = (counts['electronics'] || 0) + (catKey === 'electronics' ? 1 : 1);
        }
      }
    });

    const known = NAV_CATEGORIES.filter((c) => c.id !== 'sale' && c.id !== 'all').map((c) => {
      const slug = (c.slug || c.id).toLowerCase();
      let count = 0;
      if (slug === 'electronics') {
        count = allCatalogProducts.filter((p) => {
          const pc = (p.category || '').toLowerCase();
          return pc === 'electronics' || ELECTRONICS_SLUGS.includes(pc) || (p.categoryLabel && p.categoryLabel.toLowerCase().includes('electronic'));
        }).length;
      } else {
        count = allCatalogProducts.filter((p) => {
          const pc = (p.category || '').toLowerCase();
          const pl = (p.categoryLabel || '').toLowerCase();
          return pc === slug || pl === slug || pl.includes(c.name.toLowerCase());
        }).length;
      }
      return {
        id: slug,
        name: c.name,
        itemCount: count
      };
    });

    return known;
  }, [allCatalogProducts]);

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    return allCatalogProducts.filter((p) => {
      // 1. Search Query & Subcategory Matching
      if (queryParam) {
        const q = queryParam.toLowerCase().trim();
        const targetString = `${p.name || ''} ${p.brand || ''} ${p.categoryLabel || ''} ${p.category || ''} ${p.description || ''}`.toLowerCase();
        
        let matchesQuery = targetString.includes(q);
        
        // Intelligent token and subcategory matching when exact phrase is not in product title
        if (!matchesQuery) {
          const stopWords = new Set(['and', 'the', 'for', 'with', 'set', 'sets', 'wear', 'deals', 'products', 'accessories']);
          const words = q
            .split(/[\s&,/+]+/)
            .map((w) => w.replace(/[^a-z0-9]/g, ''))
            .filter((w) => w.length > 2 && !stopWords.has(w));
          
          if (words.length > 0) {
            matchesQuery = words.some((word) => {
              const stem = word.replace(/s$/, '').replace(/ing$/, '');
              return targetString.includes(word) || (stem.length > 3 && targetString.includes(stem));
            });
          }
        }

        if (!matchesQuery) return false;
      }

      // 2. Deals flag
      if (dealsParam && !p.isDeal) return false;

      // 3. Category Multi-select
      if (selectedCategories.length > 0) {
        const prodCat = (p.category || '').toLowerCase();
        const prodLabel = (p.categoryLabel || '').toLowerCase();
        const matchesCategory = selectedCategories.some((sel) => {
          const s = sel.toLowerCase();
          if (s === 'sale' || s === 'deals') {
            return p.isDeal || (p.discount && p.discount > 0);
          }
          if (s === 'electronics') {
            return (
              prodCat === 'electronics' ||
              ELECTRONICS_SLUGS.includes(prodCat) ||
              prodLabel.includes('electronic') ||
              prodLabel.includes('smartphones') ||
              prodLabel.includes('mobile') ||
              prodLabel.includes('laptop') ||
              prodLabel.includes('audio') ||
              prodLabel.includes('headphones')
            );
          }
          return prodCat === s || prodLabel === s || prodCat.includes(s) || prodLabel.includes(s);
        });
        if (!matchesCategory) return false;
      }

      // 4. Brand Multi-select
      if (selectedBrands.length > 0 && !selectedBrands.includes(p.brand)) {
        return false;
      }

      // 5. Price Range
      if (maxPrice < 250000 && p.price > maxPrice) return false;

      // 6. Rating Filter
      if (minRating > 0 && p.rating < minRating) return false;

      // 7. Discount Filter
      if (minDiscount > 0 && (p.discount || 0) < minDiscount) return false;

      // 8. Stock
      if (onlyInStock && !p.inStock) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'rating-desc') return b.rating - a.rating;
      if (sortBy === 'discount') return (b.discount || 0) - (a.discount || 0);
      if (sortBy === 'newest') {
        if (b.createdAt && a.createdAt) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        return (Number(b.id) || 0) - (Number(a.id) || 0);
      }
      return 0; // 'featured'
    });
  }, [
    allCatalogProducts,
    queryParam,
    dealsParam,
    selectedCategories,
    selectedBrands,
    maxPrice,
    minRating,
    minDiscount,
    onlyInStock,
    sortBy
  ]);

  const toggleCategory = (catId) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const toggleBrand = (b) => {
    setSelectedBrands((prev) =>
      prev.includes(b) ? prev.filter((brand) => brand !== b) : [...prev, b]
    );
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setMinRating(0);
    setMaxPrice(250000);
    setMinDiscount(0);
    setOnlyInStock(false);
    setSortBy('featured');
    setSearchParams({});
  };

  const activeFilterCount =
    selectedCategories.length +
    selectedBrands.length +
    (minRating > 0 ? 1 : 0) +
    (maxPrice < 250000 ? 1 : 0) +
    (minDiscount > 0 ? 1 : 0) +
    (onlyInStock ? 1 : 0);

  return (
    <div className="min-h-screen bg-[#F5F5F5] py-4 sm:py-6">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 space-y-4">
        
        {/* 1. Breadcrumb Navigation */}
        <nav className="flex items-center gap-1.5 text-xs text-[#777777]">
          <Link to="/" className="hover:text-[#E31837] transition-colors">Home</Link>
          <span>/</span>
          <Link to="/catalog" className="hover:text-[#E31837] transition-colors">Marketplace</Link>
          {categoryParam && (
            <>
              <span>/</span>
              <span className="font-semibold text-[#222222] capitalize">{categoryParam.replace(/-/g, ' ')}</span>
            </>
          )}
          {queryParam && (
            <>
              <span>/</span>
              <span className="font-semibold text-[#222222]">"{queryParam}"</span>
            </>
          )}
        </nav>

        {/* 2. Page Title Header & Sorting Bar */}
        <div className="bg-white rounded-xl border border-[#E8E8E8] p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-black text-[#222222] tracking-tight">
              {queryParam
                ? `Search results for "${queryParam}"`
                : categoryParam
                ? `${categoryParam.replace(/-/g, ' ').toUpperCase()} Department`
                : dealsParam
                ? "Today's Flash Deals"
                : 'All Marketplace Products'}
            </h1>
            <p className="text-xs text-[#777777]">
              Showing <strong className="text-[#222222]">{filteredProducts.length}</strong> matching products
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Mobile Filter Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileFilterOpen(true)}
              className="lg:hidden px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-bold text-gray-700 flex items-center gap-1.5"
            >
              <Filter className="w-3.5 h-3.5 text-[#E31837]" />
              <span>Filters ({activeFilterCount})</span>
            </button>

            {/* Sorting Dropdown */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[#777777] font-medium hidden sm:inline">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-[#E8E8E8] bg-white text-xs font-bold text-[#222222] focus:outline-none focus:ring-1 focus:ring-[#E31837] cursor-pointer"
              >
                <option value="featured">Featured First</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating-desc">Customer Rating</option>
                <option value="discount">Biggest Discount</option>
                <option value="newest">Newest Releases</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. Main Catalog Grid with Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-5 items-start">
          
          {/* ================= DESKTOP FILTER SIDEBAR ================= */}
          <aside className="hidden lg:block bg-white rounded-xl border border-[#E8E8E8] p-4 shadow-xs space-y-5 sticky top-28">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F0]">
              <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-[#222222]">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#E31837]" />
                <span>Filters</span>
              </div>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-[11px] font-bold text-[#E31837] hover:underline"
                >
                  Clear All ({activeFilterCount})
                </button>
              )}
            </div>

            {/* Filter 1: Categories */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#222222] uppercase tracking-wide">Category</h4>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {categoryList.map((cat) => (
                  <label
                    key={cat.id}
                    className="flex items-center justify-between text-xs text-gray-700 hover:text-[#E31837] cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat.id)}
                        onChange={() => toggleCategory(cat.id)}
                        className="rounded border-gray-300 text-[#E31837] focus:ring-[#E31837] w-3.5 h-3.5"
                      />
                      <span className={selectedCategories.includes(cat.id) ? 'font-bold text-[#E31837]' : ''}>
                        {cat.name}
                      </span>
                    </div>
                    {cat.itemCount > 0 && (
                      <span className="text-[10px] text-gray-400 font-mono">({cat.itemCount})</span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Filter 2: Price Range */}
            <div className="space-y-2 pt-3 border-t border-[#F0F0F0]">
              <div className="flex justify-between items-center text-xs">
                <h4 className="font-bold text-[#222222] uppercase tracking-wide">Max Price</h4>
                <span className="font-bold text-[#E31837]">₹{maxPrice.toLocaleString('en-IN')}</span>
              </div>
              <input
                type="range"
                min="200"
                max="250000"
                step="500"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-[#E31837] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                <span>₹200</span>
                <span>₹2,50,000</span>
              </div>
            </div>

            {/* Filter 3: Brand */}
            <div className="space-y-2 pt-3 border-t border-[#F0F0F0]">
              <h4 className="text-xs font-bold text-[#222222] uppercase tracking-wide">Brand</h4>
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {allBrands.map((brand) => (
                  <label
                    key={brand}
                    className="flex items-center gap-2 text-xs text-gray-700 hover:text-[#E31837] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(brand)}
                      onChange={() => toggleBrand(brand)}
                      className="rounded border-gray-300 text-[#E31837] focus:ring-[#E31837] w-3.5 h-3.5"
                    />
                    <span className={selectedBrands.includes(brand) ? 'font-bold text-[#E31837]' : ''}>
                      {brand}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filter 4: Minimum Customer Rating */}
            <div className="space-y-2 pt-3 border-t border-[#F0F0F0]">
              <h4 className="text-xs font-bold text-[#222222] uppercase tracking-wide">Customer Rating</h4>
              <div className="space-y-1">
                {[4.5, 4.0, 3.5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setMinRating(minRating === rating ? 0 : rating)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      minRating === rating ? 'bg-[#FDF2F4] text-[#E31837] font-bold' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{rating}★ &amp; above</span>
                    </div>
                    {minRating === rating && <Check className="w-3.5 h-3.5 text-[#E31837]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter 5: Discount Range */}
            <div className="space-y-2 pt-3 border-t border-[#F0F0F0]">
              <h4 className="text-xs font-bold text-[#222222] uppercase tracking-wide">Discount</h4>
              <div className="space-y-1">
                {[10, 20, 30].map((disc) => (
                  <button
                    key={disc}
                    type="button"
                    onClick={() => setMinDiscount(minDiscount === disc ? 0 : disc)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      minDiscount === disc ? 'bg-[#FDF2F4] text-[#E31837] font-bold' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span>{disc}% off or more</span>
                    {minDiscount === disc && <Check className="w-3.5 h-3.5 text-[#E31837]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter 6: Availability */}
            <div className="pt-3 border-t border-[#F0F0F0]">
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyInStock}
                  onChange={(e) => setOnlyInStock(e.target.checked)}
                  className="rounded border-gray-300 text-[#E31837] focus:ring-[#E31837] w-3.5 h-3.5"
                />
                <span className="font-semibold text-[#222222]">Exclude Out of Stock</span>
              </label>
            </div>
          </aside>

          {/* ================= PRODUCT GRID ================= */}
          <main className="lg:col-span-3 xl:col-span-4 space-y-4">
            {/* Quick Subcategory Filter Pills */}
            {selectedCategories.length === 1 && (() => {
              const currentCat = NAV_CATEGORIES.find(
                (c) => c.slug === selectedCategories[0] || c.id === selectedCategories[0]
              );
              if (!currentCat?.subcategories?.length) return null;

              return (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => {
                      const newParams = new URLSearchParams(searchParams);
                      newParams.delete('q');
                      setSearchParams(newParams);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all cursor-pointer ${
                      !queryParam
                        ? 'bg-[#E31837] text-white font-bold shadow-xs'
                        : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 font-medium'
                    }`}
                  >
                    All {currentCat.name}
                  </button>

                  {currentCat.subcategories.map((sub) => {
                    const isSelected = queryParam.toLowerCase() === sub.toLowerCase();
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => {
                          const newParams = new URLSearchParams(searchParams);
                          if (isSelected) {
                            newParams.delete('q');
                          } else {
                            newParams.set('q', sub);
                          }
                          setSearchParams(newParams);
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#E31837] text-white font-bold shadow-xs'
                            : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 font-medium'
                        }`}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-[#E8E8E8] p-12 text-center shadow-xs space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-50 text-[#E31837] flex items-center justify-center mx-auto">
                  <Filter className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[#222222]">No Products Match Your Filter</h3>
                  <p className="text-xs text-[#777777] max-w-sm mx-auto">
                    Try relaxing your price range, clearing brand selections, or searching for other marketplace categories.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-5 py-2.5 rounded-lg bg-[#E31837] hover:bg-[#C7122E] text-white text-xs font-bold shadow-sm transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </main>

        </div>
      </div>

      {/* ================= MOBILE FILTER DRAWER ================= */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end lg:hidden">
          {/* Backdrop close overlay */}
          <div className="fixed inset-0" onClick={() => setIsMobileFilterOpen(false)} />

          <div className="relative z-10 w-4/5 max-w-xs bg-white h-full flex flex-col shadow-2xl p-4 overflow-y-auto space-y-4 animate-slideLeft">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <span className="font-bold text-sm text-[#222222]">Filter Products</span>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="p-1 text-gray-500 hover:text-gray-800 cursor-pointer"
                aria-label="Close filters"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category */}
            <div>
              <p className="text-xs font-bold text-gray-800 uppercase mb-2">Category</p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {categoryList.map((cat) => (
                  <label key={cat.id} className="flex items-center justify-between text-xs text-gray-700">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat.id)}
                        onChange={() => toggleCategory(cat.id)}
                        className="rounded text-[#E31837] focus:ring-[#E31837]"
                      />
                      <span>{cat.name}</span>
                    </div>
                    {cat.itemCount > 0 && (
                      <span className="text-[10px] text-gray-400 font-mono">({cat.itemCount})</span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Price */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-800 uppercase mb-2">
                Max Price: ₹{maxPrice.toLocaleString('en-IN')}
              </p>
              <input
                type="range"
                min="200"
                max="250000"
                step="500"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-[#E31837]"
              />
            </div>

            {/* Apply & Clear buttons */}
            <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={clearAllFilters}
                className="py-2.5 rounded-lg border border-gray-300 text-xs font-bold text-gray-700"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="py-2.5 rounded-lg bg-[#E31837] text-white text-xs font-bold"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
