import React from 'react';
import { Link } from 'react-router-dom';
import UnikartLogo from './UnikartLogo';
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  Headphones,
  Heart,
  CreditCard,
  CheckCircle2,
  PhoneCall,
  Mail,
  MapPin
} from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#252525] text-white pt-10 sm:pt-12 pb-24 md:pb-8 border-t border-[#333333]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        
        {/* Main Footer – 5 columns in a single row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 lg:gap-8 pb-10 border-b border-[#383838]">

          {/* Column 1: Brand & Contact */}
          <div className="col-span-2 md:col-span-1 space-y-3.5">
            <Link to="/" className="inline-block group">
              <UnikartLogo variant="white" iconSize={36} showTagline={true} />
            </Link>
            <p className="text-xs text-gray-400 leading-relaxed">
              India's premier multi-category marketplace. 1,000,000+ genuine products with lightning-fast delivery.
            </p>
            <div className="space-y-1.5 text-xs text-gray-300">
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#E31837] shrink-0 mt-0.5" />
                <span>Thiruvananthapuram, Kerala – 695001</span>
              </div>
              <div className="flex items-center gap-2">
                <PhoneCall className="w-3.5 h-3.5 text-[#E31837] shrink-0" />
                <span>+91 9072849672</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#E31837] shrink-0" />
                <span>support@unikart.in</span>
              </div>
            </div>
          </div>

          {/* Column 2: Electronics & Tech */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Electronics
            </h4>
            <ul className="space-y-2 text-xs text-gray-400">
              <li>
                <Link to="/catalog?category=electronics" className="hover:text-[#E31837] transition-colors">
                  Flagship Smartphones
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=electronics" className="hover:text-[#E31837] transition-colors">
                  Wireless ANC Headphones
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=electronics" className="hover:text-[#E31837] transition-colors">
                  Creator &amp; Gaming Laptops
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=electronics" className="hover:text-[#E31837] transition-colors">
                  4K OLED Smart TVs
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=electronics" className="hover:text-[#E31837] transition-colors">
                  Smartwatches &amp; Wearables
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=electronics" className="hover:text-[#E31837] transition-colors">
                  Gaming Consoles &amp; PC
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Fashion & Lifestyle */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Fashion &amp; Living
            </h4>
            <ul className="space-y-2 text-xs text-gray-400">
              <li>
                <Link to="/catalog?category=fashion" className="hover:text-[#E31837] transition-colors">
                  Men's Casual &amp; Denim
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=fashion" className="hover:text-[#E31837] transition-colors">
                  Women's Dresses &amp; Ethnic
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=footwear" className="hover:text-[#E31837] transition-colors">
                  Sneakers &amp; Running Shoes
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=home-kitchen" className="hover:text-[#E31837] transition-colors">
                  Kitchen Blenders &amp; Air Fryers
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=furniture" className="hover:text-[#E31837] transition-colors">
                  Ergonomic Chairs &amp; Sofas
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=jewellery" className="hover:text-[#E31837] transition-colors">
                  925 Silver &amp; Handbags
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Daily Needs & Wellness */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Daily &amp; Family
            </h4>
            <ul className="space-y-2 text-xs text-gray-400">
              <li>
                <Link to="/catalog?category=beauty" className="hover:text-[#E31837] transition-colors">
                  Skincare Serums &amp; Makeup
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=grocery" className="hover:text-[#E31837] transition-colors">
                  Organic Grocery &amp; Staples
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=sports" className="hover:text-[#E31837] transition-colors">
                  Gym Weights &amp; Nutrition
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=toys" className="hover:text-[#E31837] transition-colors">
                  STEM Toys &amp; Board Games
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=baby" className="hover:text-[#E31837] transition-colors">
                  Baby Care &amp; Diapers
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=pets" className="hover:text-[#E31837] transition-colors">
                  Pet Food &amp; Accessories
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 5: Customer Care & Company */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Customer Support
            </h4>
            <ul className="space-y-2 text-xs text-gray-400">
              <li>
                <Link to="/account?tab=orders" className="hover:text-[#E31837] transition-colors">
                  Track Your Package
                </Link>
              </li>
              <li>
                <Link to="/account?tab=orders" className="hover:text-[#E31837] transition-colors">
                  Return &amp; Replacement
                </Link>
              </li>
              <li>
                <Link to="/account?tab=addresses" className="hover:text-[#E31837] transition-colors">
                  Manage Delivery Addresses
                </Link>
              </li>
              <li>
                <Link to="/account?tab=wishlist" className="hover:text-[#E31837] transition-colors">
                  Saved Wishlist
                </Link>
              </li>
              <li>
                <span className="text-gray-500 cursor-not-allowed">100% Purchase Protection</span>
              </li>
              <li>
                <span className="text-gray-500 cursor-not-allowed">Help Center &amp; FAQs</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Strip */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span>&copy; {new Date().getFullYear()} UNIKART Marketplace Technologies Pvt. Ltd. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-4 text-gray-400">
            <span className="hover:text-white cursor-pointer transition-colors">Privacy Notice</span>
            <span>&bull;</span>
            <span className="hover:text-white cursor-pointer transition-colors">Terms of Use</span>
            <span>&bull;</span>
            <span className="hover:text-white cursor-pointer transition-colors">Security &amp; Compliance</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
