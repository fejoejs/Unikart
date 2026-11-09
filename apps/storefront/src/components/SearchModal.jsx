import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore, useCatalogStore } from '../store/useStore';
import { NAV_CATEGORIES as CATEGORIES } from '../data/appConfig';
import { Search, X, TrendingUp, Clock, Star, ArrowRight, Package } from 'lucide-react';

const TRENDING_SEARCHES = [
  'iPhone 16 Pro',
  'Nike Pegasus Running',
  'Ninja DualZone Air Fryer',
  'Levi\'s Denim Jacket',
  'Organic Olive Oil',
  'LEGO Millennium Falcon',
  'Herman Miller Aeron',
  'Dior Sauvage EDP',
  'Optimum Nutrition Whey',
  '70mai 4K Dash Cam'
];

export default function SearchModal() {
  const { isSearchModalOpen, closeSearchModal } = useUIStore();
  const { products } = useCatalogStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [recentSearches, setRecentSearches] = useState([
    'Running Shoes',
    'Kitchen Appliances',
    'Smartphones'
  ]);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isSearchModalOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearchTerm('');
    }
  }, [isSearchModalOpen]);

  if (!isSearchModalOpen) return null;

  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === 'all' || p.category === selectedCategory;
    const query = searchTerm.toLowerCase().trim();
    if (!query) return false;
    const matchesQuery =
      p.name.toLowerCase().includes(query) ||
      p.brand.toLowerCase().includes(query) ||
      (p.categoryLabel && p.categoryLabel.toLowerCase().includes(query)) ||
      (p.description && p.description.toLowerCase().includes(query));
    return matchesCategory && matchesQuery;
  }).slice(0, 6);

  const handleSelectProduct = (productId) => {
    closeSearchModal();
    navigate(`/product/${productId}`);
  };

  const handleExecuteSearch = (query) => {
    if (!query) return;
    if (!recentSearches.includes(query)) {
      setRecentSearches([query, ...recentSearches.slice(0, 4)]);
    }
    closeSearchModal();
    navigate(`/catalog?q=${encodeURIComponent(query)}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleExecuteSearch(searchTerm);
    }
    if (e.key === 'Escape') {
      closeSearchModal();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/20 animate-fadeIn">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Bar Input */}
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-[#E31837]" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search electronics, smartphones, laptops, audio..."
            className="flex-1 text-sm font-medium text-[#222222] placeholder-gray-400 focus:outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => handleExecuteSearch(searchTerm)}
            className="px-3.5 py-1.5 rounded-lg bg-[#E31837] hover:bg-[#C7122E] text-white text-xs font-bold"
          >
            Search
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4">
          {filteredProducts.length > 0 ? (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Matching Electronics
              </span>
              <div className="divide-y divide-gray-100">
                {filteredProducts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectProduct(p.id)}
                    className="py-2 flex items-center justify-between hover:bg-[#FDF2F4] p-2 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img src={p.image} alt="" className="w-10 h-10 object-contain p-1 border rounded bg-white" />
                      <div>
                        <p className="text-xs font-bold text-[#222222]">{p.name}</p>
                        <p className="text-[11px] text-gray-400">{p.brand} &bull; {p.categoryLabel}</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-[#E31837]">₹{p.price.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Trending Electronics
                </span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {TRENDING_SEARCHES.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleExecuteSearch(tag)}
                      className="px-2.5 py-1 rounded-full text-xs bg-gray-100 hover:bg-[#FFE8EC] hover:text-[#E31837] text-gray-700 font-medium transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {recentSearches.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Recent Searches
                  </span>
                  <div className="space-y-1 mt-1.5">
                    {recentSearches.map((r, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleExecuteSearch(r)}
                        className="flex items-center justify-between py-1.5 px-2 hover:bg-gray-50 rounded cursor-pointer text-xs text-gray-700"
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>{r}</span>
                        </div>
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
