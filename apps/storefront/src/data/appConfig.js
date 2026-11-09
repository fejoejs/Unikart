// ─── Static App Configuration ───────────────────────────────────────────────
// UI-only config that doesn't come from the database.
// Products, Categories and Brands are loaded from the backend API.

// ─── Navigation Categories (UI icons, images, descriptions & subcategories) ──
export const NAV_CATEGORIES = [
  {
    id: 'sale',
    name: 'Super Deals',
    slug: 'sale',
    isSale: true,
    icon: 'Flame',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=240&auto=format&fit=crop&q=80',
    description: 'Flash discounts, clearance markdowns, and daily lightning deals across all categories.',
    subcategories: [
      'Under ₹499 Deals',
      'Under ₹999 Deals',
      'Min. 50% Off',
      'Min. 70% Off',
      'Lightning Deals',
      'Clearance Specials'
    ]
  },
  {
    id: 'electronics',
    name: 'Electronics',
    slug: 'electronics',
    icon: 'Smartphone',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=240&auto=format&fit=crop&q=80',
    description: 'Flagship smartphones, pro laptops, ANC audio, OLED displays, and smart gadgets.',
    subcategories: [
      'Smartphones & 5G',
      'Laptops & MacBooks',
      'Audio & Headphones',
      'Smartwatches & Fitness',
      'Televisions & Home Audio',
      'Cameras & Photography',
      'Gaming Consoles & Gear',
      'Tech Accessories & Chargers'
    ]
  },
  {
    id: 'fashion',
    name: 'Fashion & Apparel',
    slug: 'fashion',
    icon: 'Shirt',
    image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=240&auto=format&fit=crop&q=80',
    description: 'Trendsetting apparel, designer dresses, shirts, denim, activewear, and outerwear.',
    subcategories: [
      "Men's Casual & Formal Wear",
      "Women's Western & Fusion",
      'Ethnic Kurtas & Sarees',
      'Hoodies, Jackets & Denim',
      'Activewear & Loungewear',
      'Kids & Teens Fashion'
    ]
  },
  {
    id: 'home-kitchen',
    name: 'Home & Kitchen',
    slug: 'home-kitchen',
    icon: 'Home',
    image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=240&auto=format&fit=crop&q=80',
    description: 'Kitchen appliances, non-stick cookware sets, dining essentials, and smart home care.',
    subcategories: [
      'Kitchen Appliances & Blenders',
      'Cookware & Non-Stick Sets',
      'Dinnerware & Drinkware',
      'Kitchen Storage & Organizers',
      'Bed Linen & Comforters',
      'Cleaning & Utility'
    ]
  },
  {
    id: 'beauty',
    name: 'Beauty & Personal Care',
    slug: 'beauty',
    icon: 'Sparkles',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=240&auto=format&fit=crop&q=80',
    description: 'Dermatological skincare, premium makeup, salon hair care, perfumes, and grooming.',
    subcategories: [
      'Skincare & Vitamin Serums',
      'Makeup & Cosmetics',
      'Hair Care & Styling',
      'Luxury Fragrances & Deos',
      "Men's Grooming & Shaving",
      'Bath, Body & Spa'
    ]
  },
  {
    id: 'grocery',
    name: 'Grocery & Gourmet',
    slug: 'grocery',
    icon: 'ShoppingBasket',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=240&auto=format&fit=crop&q=80',
    description: 'Farm-fresh organic produce, cold-pressed oils, dry fruits, staples, and gourmet treats.',
    subcategories: [
      'Fresh Fruits & Vegetables',
      'Pantry Staples, Atta & Rice',
      'Gourmet Coffee & Green Teas',
      'Organic Dry Fruits & Nuts',
      'Snacks, Cookies & Chocolates',
      'Dairy, Breakfast & Cereals'
    ]
  },
  {
    id: 'sports',
    name: 'Sports & Fitness',
    slug: 'sports',
    icon: 'Activity',
    image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=240&auto=format&fit=crop&q=80',
    description: 'Gym equipment, smart dumbbells, sports gear, yoga mats, and athletic supplements.',
    subcategories: [
      'Home Gym & Free Weights',
      'Cardio Machines & Treadmills',
      'Yoga Mats & Resistance Bands',
      'Cricket, Football & Racket',
      'Sports Nutrition & Whey',
      'Athletic Bags & Accessories'
    ]
  },
  {
    id: 'furniture',
    name: 'Furniture & Decor',
    slug: 'furniture',
    icon: 'Armchair',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=240&auto=format&fit=crop&q=80',
    description: 'Ergonomic chairs, solid wood tables, accent sofas, modern lighting, and wall art.',
    subcategories: [
      'Ergonomic Office Chairs',
      'Living Room Sofas & Recliners',
      'Study & Computer Desks',
      'Ambient Lighting & Lamps',
      'Wall Decor, Mirrors & Clocks',
      'Rugs, Cushions & Furnishings'
    ]
  },
  {
    id: 'footwear',
    name: 'Footwear',
    slug: 'footwear',
    icon: 'Footprints',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=240&auto=format&fit=crop&q=80',
    description: "Sneakers, running shoes, formal leather brogues, women's heels, and comfort sandals.",
    subcategories: [
      "Men's Sneakers & Casuals",
      'Performance Running Shoes',
      'Formal Leather Oxfords',
      "Women's Heels & Party Flats",
      'Orthopedic Comfort Sandals',
      'Hiking & Outdoor Boots'
    ]
  },
  {
    id: 'toys',
    name: 'Toys & Games',
    slug: 'toys',
    icon: 'Gamepad2',
    image: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=240&auto=format&fit=crop&q=80',
    description: 'STEM educational kits, building blocks, strategy board games, and remote control toys.',
    subcategories: [
      'STEM & Learning Toys',
      'Board Games & Puzzles',
      'Building Blocks & LEGO Sets',
      'Remote Control Cars & Drones',
      'Action Figures & Collectibles',
      'Plush Soft Toys & Dolls'
    ]
  },
  {
    id: 'books',
    name: 'Books & Stationery',
    slug: 'books',
    icon: 'BookOpen',
    image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=240&auto=format&fit=crop&q=80',
    description: 'Fiction, self-development, exam preparations, luxury journals, and artist stationery.',
    subcategories: [
      'Bestselling Novels & Fiction',
      'Business, Finance & Self-Help',
      'Academic & Exam Reference',
      'Fine Art & Calligraphy',
      'Leather Journals & Planners',
      'Office Stationery & Organizers'
    ]
  },
  {
    id: 'jewellery',
    name: 'Jewellery & Accessories',
    slug: 'jewellery',
    icon: 'Watch',
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=240&auto=format&fit=crop&q=80',
    description: 'Sterling silver jewellery, sunglasses, leather wallets, wristwatches, and luggage.',
    subcategories: [
      'Sterling Silver 925 Jewellery',
      'Fashion Necklaces & Rings',
      'Luxury Analog & Chrono Watches',
      'Polarized Sunglasses',
      'Genuine Leather Wallets & Belts',
      'Travel Backpacks & Duffles'
    ]
  },
  {
    id: 'baby',
    name: 'Baby & Kids',
    slug: 'baby',
    icon: 'Smile',
    image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=240&auto=format&fit=crop&q=80',
    description: 'Diapers, gentle skincare, compact strollers, feeding essentials, and infant wear.',
    subcategories: [
      'Diapers, Pants & Pure Wipes',
      'Strollers, Prams & Car Seats',
      'Feeding Bottles & Nursing',
      'Organic Baby Apparel Sets',
      'Gentle Baby Bath & Skincare',
      'Nursery Furniture & Monitors'
    ]
  },
  {
    id: 'automotive',
    name: 'Automotive',
    slug: 'automotive',
    icon: 'Car',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=240&auto=format&fit=crop&q=80',
    description: 'Dash cameras, tyre inflators, car vacuums, riding helmets, and vehicle detailing.',
    subcategories: [
      'Car Dash Cams & Audio',
      'Tyre Inflators & Emergency Kits',
      'High-Power Car Vacuums',
      'Motorcycle Riding Helmets & Gear',
      'Car Care, Polish & Ceramic Wax',
      'Phone Mounts & In-Car Chargers'
    ]
  },
  {
    id: 'pets',
    name: 'Pet Supplies',
    slug: 'pets',
    icon: 'Heart',
    image: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=240&auto=format&fit=crop&q=80',
    description: 'Nutritious pet food, orthopedic beds, cat trees, interactive toys, and grooming.',
    subcategories: [
      'Dog Nutrition & Crunchy Treats',
      'Cat Food, Litter & Scratchers',
      'Orthopedic Pet Beds & Mats',
      'Interactive Chew & Fetch Toys',
      'Pet Grooming, Shampoos & Brushes',
      'Leashes, Harnesses & Collars'
    ]
  }
];

// ─── Hero Carousel Slides ────────────────────────────────────────────────────
export const HERO_SLIDES = [
  {
    id: 1,
    badge: 'Mega Marketplace Carnival',
    headline: 'Everything You Love, All in One Place',
    subtext: 'Explore millions of top-rated products across fashion, electronics, home essentials, beauty, and daily groceries with lightning-fast delivery.',
    ctaText: 'Explore Marketplace',
    ctaLink: '/catalog',
    secondaryCtaText: "Today's Super Deals",
    secondaryCtaLink: '/catalog?deals=true',
    discountBadge: 'Universal Deals',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1000&auto=format&fit=crop&q=80',
  },
  {
    id: 2,
    badge: 'Runway Fashion & Lifestyle',
    headline: 'Upgrade Your Style. Discover New Fashion.',
    subtext: 'Step out in high-fashion designer apparel, premium sneakers, authentic leather handbags, and statement jewellery curated for every occasion.',
    ctaText: 'Shop Fashion',
    ctaLink: '/catalog?category=fashion',
    secondaryCtaText: 'Trending Outfits',
    secondaryCtaLink: '/catalog?category=fashion',
    discountBadge: 'Min. 50% Off',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1000&auto=format&fit=crop&q=80',
  },
  {
    id: 3,
    badge: 'Modern Living Festival',
    headline: 'Transform Your Home with Amazing Deals',
    subtext: 'Elevate your sanctuary with ergonomic furniture, air fryers, ambient lighting, and luxury cookware.',
    ctaText: 'Shop Home & Decor',
    ctaLink: '/catalog?category=home-kitchen',
    secondaryCtaText: 'Kitchen Essentials',
    secondaryCtaLink: '/catalog?category=home-kitchen',
    discountBadge: 'Up to 60% Off',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1000&auto=format&fit=crop&q=80',
  },
  {
    id: 4,
    badge: 'Next-Gen Tech Innovations',
    headline: 'Discover the Latest Tech & Gadgets',
    subtext: 'Experience flagship 5G smartphones, studio-grade headphones, M3 MacBooks, and 4K smart displays.',
    ctaText: 'Explore Tech',
    ctaLink: '/catalog?category=electronics',
    secondaryCtaText: 'Compare Devices',
    secondaryCtaLink: '/catalog?category=electronics',
    discountBadge: 'Extra 10% Bank Off',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1000&auto=format&fit=crop&q=80',
  },
  {
    id: 5,
    badge: 'Fresh & Fast 2-Hour Delivery',
    headline: 'Everyday Essentials at Great Prices',
    subtext: 'Stock your kitchen with organic fruits, premium dry fruits, cold-pressed oils, and gourmet coffee.',
    ctaText: 'Shop Daily Grocery',
    ctaLink: '/catalog?category=grocery',
    secondaryCtaText: 'Pantry Combos',
    secondaryCtaLink: '/catalog?category=grocery',
    discountBadge: 'Buy 1 Get 1 Free',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1000&auto=format&fit=crop&q=80',
  },
];

// ─── Promotional Banners ──────────────────────────────────────────────────────
export const PROMO_BANNERS = [
  {
    id: 'promo-1',
    tag: 'Bank Cashback',
    title: 'Instant 10% Off with HDFC & ICICI Cards',
    subtitle: 'Valid on orders above ₹4,999 across all marketplace categories',
    cta: 'Claim Offer',
    link: '/catalog',
    bgGradient: 'from-[#252525] to-[#3a3a3a]',
    accent: '#E31837',
  },
  {
    id: 'promo-2',
    tag: 'Fashion Season',
    title: "Flat ₹1,000 Off on Wardrobe Refresh",
    subtitle: "Top brands like Levi's, Nike, Zara & Allen Solly on heavy discounts",
    cta: 'Shop Fashion',
    link: '/catalog?category=fashion',
    bgGradient: 'from-[#E31837] via-[#F42B50] to-[#F05A82]',
    accent: '#FFFFFF',
  },
  {
    id: 'promo-3',
    tag: 'Express Grocery',
    title: '2-Hour Doorstep Delivery on Daily Essentials',
    subtitle: 'Fresh organic vegetables, pantry staples, and gourmet breakfast items',
    cta: 'Order Grocery',
    link: '/catalog?category=grocery',
    bgGradient: 'from-[#1a1a2e] to-[#16213e]',
    accent: '#F42B50',
  },
];

// ─── Customer Benefits ────────────────────────────────────────────────────────
export const CUSTOMER_BENEFITS = [
  { icon: 'Truck',        title: 'Express 24-Hour Delivery',    desc: 'Speedy doorstep delivery on 100,000+ eligible products nationwide' },
  { icon: 'ShieldCheck',  title: '100% Genuine Guarantee',      desc: 'Direct brand sourcing with authentic manufacturer warranty protection' },
  { icon: 'RotateCcw',    title: 'Hassle-Free 7-Day Returns',   desc: 'Easy zero-question returns and doorstep exchange pickup' },
  { icon: 'Headphones',   title: '24/7 Universal Customer Care', desc: 'Dedicated multilingual support team ready to assist round-the-clock' },
];

// ─── Top Brands (UI display with official vector logos) ──────────────────────
export const TOP_BRANDS = [
  { name: 'Apple',   tag: 'Tech Official',    category: 'Electronics', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg' },
  { name: 'Nike',    tag: 'Sportswear',       category: 'Fashion',     logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg' },
  { name: 'Samsung', tag: 'Global Partner',   category: 'Electronics', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg' },
  { name: 'IKEA',    tag: 'Modern Living',    category: 'Furniture',   logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Ikea_logo.svg' },
  { name: "L'Oréal", tag: 'Beauty Expert',    category: 'Beauty',      logo: 'https://upload.wikimedia.org/wikipedia/commons/9/9d/L%27Or%C3%A9al_logo.svg' },
  { name: 'Philips', tag: 'Smart Home',       category: 'Appliances',  logo: 'https://upload.wikimedia.org/wikipedia/commons/7/77/Philips_logo.svg' },
  { name: 'Adidas',  tag: 'Active Sports',    category: 'Sports',      logo: 'https://upload.wikimedia.org/wikipedia/commons/2/20/Adidas_Logo.svg' },
  { name: 'Nestlé',  tag: 'Daily Essentials', category: 'Grocery',     logo: 'https://upload.wikimedia.org/wikipedia/commons/b/bf/Nestl%C3%A9_textlogo.svg' },
  { name: 'LEGO',    tag: 'Creative Play',    category: 'Toys',        logo: 'https://upload.wikimedia.org/wikipedia/commons/2/24/LEGO_logo.svg' },
  { name: 'Puma',    tag: 'Footwear Leader',  category: 'Footwear',    logo: 'https://upload.wikimedia.org/wikipedia/commons/8/88/Puma_complete_logo.svg' },
  { name: 'Prestige',tag: 'Kitchen Master',   category: 'Home',        logo: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=120&auto=format&fit=crop&q=80' },
  { name: 'Titan',   tag: 'Jewellery & Style',category: 'Accessories', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a7/Titan_Company_Logo.svg' },
];

// ─── Pincode Delivery SLA ─────────────────────────────────────────────────────
export const PINCODES = {
  '560001': { city: 'Bengaluru',  state: 'Karnataka',    expressAvailable: true, slaHours: 2 },
  '400001': { city: 'Mumbai',     state: 'Maharashtra',  expressAvailable: true, slaHours: 2 },
  '110001': { city: 'New Delhi',  state: 'Delhi',        expressAvailable: true, slaHours: 2 },
  '600001': { city: 'Chennai',    state: 'Tamil Nadu',   expressAvailable: true, slaHours: 4 },
  '500001': { city: 'Hyderabad',  state: 'Telangana',    expressAvailable: true, slaHours: 3 },
  '700001': { city: 'Kolkata',    state: 'West Bengal',  expressAvailable: true, slaHours: 4 },
  '411001': { city: 'Pune',       state: 'Maharashtra',  expressAvailable: true, slaHours: 3 },
};

// ─── Discount Coupons ─────────────────────────────────────────────────────────
export const COUPONS = {
  WELCOME500: { code: 'WELCOME500', discountAmount: 500,  minOrder: 1999, description: '₹500 flat discount on your first marketplace order' },
  SUPERDEAL:  { code: 'SUPERDEAL',  discountPercent: 15,  maxDiscount: 1500, minOrder: 2999, description: '15% instant savings up to ₹1,500' },
  FASHION100: { code: 'FASHION100', discountAmount: 1000, minOrder: 3499, description: '₹1,000 off on apparel and footwear' },
  UNIKART10:  { code: 'UNIKART10',  discountPercent: 10,  maxDiscount: 2000, minOrder: 999, description: '10% universal sitewide savings' },
};

// ─── Neutral "No Image Available" Placeholder Model ──────────────────────────
export const NO_IMAGE_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23F8FAFC'/%3E%3Crect x='110' y='95' width='180' height='135' rx='16' fill='none' stroke='%23CBD5E1' stroke-width='9'/%3E%3Ccircle cx='160' cy='140' r='15' fill='%23CBD5E1'/%3E%3Cpath d='M132 195 L172 148 L212 195 L242 165 L268 195' fill='none' stroke='%23CBD5E1' stroke-width='9' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ctext x='200' y='275' text-anchor='middle' font-family='system-ui, -apple-system, sans-serif' font-size='15' font-weight='600' fill='%2394A3B8' letter-spacing='0.3'%3ENo Image Available%3C/text%3E%3C/svg%3E";

