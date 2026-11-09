import React, { useState, useEffect } from 'react';
import { useLocationStore, useUIStore } from '../store/useStore';
import { resolvePincodePrefix, lookupPostalPincode, INDIAN_STATES } from '../lib/pincodeResolver';
import { MapPin, X, Check, Navigation, Zap, ShieldCheck, AlertCircle, Building2, Home, Search } from 'lucide-react';

const POPULAR_CITIES = [
  { city: 'Bengaluru', place: 'Indiranagar', state: 'Karnataka', pin: '560038' },
  { city: 'Mumbai', place: 'Andheri West', state: 'Maharashtra', pin: '400053' },
  { city: 'New Delhi', place: 'Connaught Place', state: 'Delhi', pin: '110001' },
  { city: 'Hyderabad', place: 'Hitech City', state: 'Telangana', pin: '500081' },
  { city: 'Chennai', place: 'T. Nagar', state: 'Tamil Nadu', pin: '600017' },
  { city: 'Kolkata', place: 'Salt Lake', state: 'West Bengal', pin: '700091' },
  { city: 'Pune', place: 'Kothrud', state: 'Maharashtra', pin: '411038' },
  { city: 'Ahmedabad', place: 'Navrangpura', state: 'Gujarat', pin: '380009' },
  { city: 'Kochi', place: 'Edappally', state: 'Kerala', pin: '682024' },
  { city: 'Thiruvananthapuram', place: 'Palayam', state: 'Kerala', pin: '695034' },
  { city: 'Kanyakumari', place: 'Nagercoil', state: 'Tamil Nadu', pin: '629001' },
  { city: 'Jaipur', place: 'Malviya Nagar', state: 'Rajasthan', pin: '302017' }
];

export default function LocationModal() {
  const { isLocationModalOpen, closeLocationModal, addToast } = useUIStore();
  const { pincode, city, place, state, setLocation } = useLocationStore();

  const [inputPin, setInputPin] = useState(pincode || '');
  const [inputPlace, setInputPlace] = useState(place || '');
  const [inputCity, setInputCity] = useState(city || '');
  const [inputState, setInputState] = useState(state || 'Tamil Nadu');
  const [pinError, setPinError] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState('');
  const [resolvedInfo, setResolvedInfo] = useState(null);

  // Sync internal state whenever modal opens or store changes
  useEffect(() => {
    if (isLocationModalOpen) {
      setInputPin(pincode || '');
      setInputPlace(place || '');
      setInputCity(city || '');
      setInputState(state || 'Tamil Nadu');
      setPinError('');
      setDetectionStatus('');
      if (pincode && pincode.length === 6) {
        setResolvedInfo(resolvePincodePrefix(pincode));
      }
    }
  }, [isLocationModalOpen, pincode, city, place, state]);

  if (!isLocationModalOpen) return null;

  // Handle manual 6-digit PIN change and auto-suggest location
  const handlePinChange = async (e) => {
    const clean = e.target.value.replace(/\D/g, '').substring(0, 6);
    setInputPin(clean);
    setPinError('');

    if (clean.length === 6) {
      const localMatch = resolvePincodePrefix(clean);
      if (localMatch) {
        setResolvedInfo(localMatch);
        if (!inputCity || inputCity === 'India') setInputCity(localMatch.city);
        if (!inputState || inputState === 'All States') setInputState(localMatch.state);
        if (!inputPlace && localMatch.place) setInputPlace(localMatch.place);
      }

      // Check official India Post directory for authoritative post office name
      try {
        const official = await lookupPostalPincode(clean);
        if (official) {
          setResolvedInfo(official);
          if (official.city && (!inputCity || inputCity === 'India')) setInputCity(official.city);
          if (official.state && (!inputState || inputState === 'All States')) setInputState(official.state);
          if (official.place && !inputPlace) setInputPlace(official.place);
        }
      } catch (err) {
        // Fallback silently
      }
    } else {
      setResolvedInfo(null);
    }
  };

  // Submit manual address & locality form
  const handleSaveLocation = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanPin = inputPin.trim();

    if (!cleanPin || !/^\d{6}$/.test(cleanPin)) {
      setPinError('Please enter a valid 6-digit Indian PIN code.');
      return;
    }

    const finalCity = inputCity.trim() || resolvedInfo?.city || 'City';
    const finalState = inputState.trim() || resolvedInfo?.state || 'India';
    const finalPlace = inputPlace.trim() || resolvedInfo?.place || '';

    setLocation(cleanPin, finalCity, finalState, finalPlace);
    setPinError('');

    const displayLabel = finalPlace ? `${finalPlace}, ${finalCity}` : finalCity;
    addToast(`Delivery location set to ${displayLabel} (${cleanPin})`, 'success');
    closeLocationModal();
  };

  // Select Popular City Preset
  const handleSelectQuickCity = (c) => {
    setInputPin(c.pin);
    setInputCity(c.city);
    setInputPlace(c.place || '');
    setInputState(c.state);
    setLocation(c.pin, c.city, c.state, c.place || '');
    setPinError('');
    const displayLabel = c.place ? `${c.place}, ${c.city}` : c.city;
    addToast(`Delivery location updated to ${displayLabel}!`, 'success');
    closeLocationModal();
  };

  // Select State Dropdown
  const handleSelectState = (e) => {
    const selectedStateName = e.target.value;
    if (!selectedStateName) return;
    const match = INDIAN_STATES.find((s) => s.name === selectedStateName);
    if (match) {
      setInputPin(match.defaultPin);
      setInputCity(match.defaultCity);
      setInputPlace('');
      setInputState(match.name);
      setLocation(match.defaultPin, match.defaultCity, match.name, '');
      setPinError('');
      addToast(`Location set to ${match.defaultCity}, ${match.name}!`, 'success');
      closeLocationModal();
    }
  };

  // High-Accuracy GPS Auto-Detection
  const handleDetectLocation = async () => {
    setDetecting(true);
    setPinError('');
    setDetectionStatus('Requesting high-accuracy GPS satellite coordinates...');

    const applyGPSResult = (pin, cityName, stateName, placeName) => {
      setInputPin(pin);
      setInputCity(cityName);
      setInputState(stateName);
      setInputPlace(placeName);
      setLocation(pin, cityName, stateName, placeName);
      setDetecting(false);
      setDetectionStatus('');
      const displayLabel = placeName ? `${placeName}, ${cityName}` : cityName;
      addToast(`GPS Pinpointed: ${displayLabel} (${pin})`, 'success');
      closeLocationModal();
    };

    // Fallback using IP network location if GPS is denied or unavailable
    const runIpFallback = async (reason = '') => {
      setDetectionStatus('Detecting via network IP gateway...');
      try {
        const res = await fetch('https://ipwho.is/');
        const data = await res.json();
        if (data && data.success !== false) {
          const pin = (data.postal || '').replace(/\D/g, '').substring(0, 6);
          const cityName = data.city || data.region || 'India';
          const stateName = data.region || 'India';
          if (pin && pin.length === 6) {
            applyGPSResult(pin, cityName, stateName, '');
            return;
          }
          const stateObj = INDIAN_STATES.find(
            (s) =>
              s.name.toLowerCase() === stateName.toLowerCase() ||
              stateName.toLowerCase().includes(s.name.toLowerCase())
          );
          const fallbackPin = stateObj?.defaultPin || '560001';
          applyGPSResult(fallbackPin, cityName, stateName, '');
          return;
        }
      } catch (err) {
        console.warn('IP detect error:', err);
      }
      setDetecting(false);
      setDetectionStatus('');
      setPinError(reason || 'Could not detect GPS location automatically. Please enter your location manually below.');
    };

    if (!('geolocation' in navigator)) {
      await runIpFallback('Browser does not support geolocation.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          setDetectionStatus('Reverse geocoding exact street and locality...');
          const { latitude, longitude } = position.coords;

          let detectedPlace = '';
          let detectedCity = '';
          let detectedState = '';
          let detectedPin = '';

          // 1. Primary: OpenStreetMap Nominatim High-Zoom Reverse Geocode
          try {
            const nomRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
            );
            if (nomRes.ok) {
              const nomData = await nomRes.json();
              if (nomData && nomData.address) {
                const addr = nomData.address;
                detectedPin = (addr.postcode || '').replace(/\D/g, '').substring(0, 6);
                detectedPlace =
                  addr.suburb ||
                  addr.neighbourhood ||
                  addr.residential ||
                  addr.village ||
                  addr.town ||
                  addr.hamlet ||
                  addr.road ||
                  addr.quarter ||
                  addr.subdistrict ||
                  '';
                detectedCity = addr.city || addr.town || addr.county || addr.state_district || '';
                detectedState = addr.state || '';
              }
            }
          } catch (nomErr) {
            console.warn('Nominatim reverse geocode error:', nomErr);
          }

          // 2. Secondary: BigDataCloud Reverse Geocode Client
          if (!detectedPin || !detectedPlace) {
            try {
              const bdcRes = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
              );
              if (bdcRes.ok) {
                const bdcData = await bdcRes.json();
                if (bdcData) {
                  if (!detectedPin) {
                    detectedPin = (bdcData.postcode || '').replace(/\D/g, '').substring(0, 6);
                  }
                  if (!detectedPlace) {
                    detectedPlace = bdcData.locality || bdcData.subLocality || '';
                  }
                  if (!detectedCity) {
                    detectedCity =
                      bdcData.city ||
                      bdcData.localityInfo?.administrative?.[2]?.name ||
                      bdcData.principalSubdivision ||
                      '';
                  }
                  if (!detectedState) {
                    detectedState = bdcData.principalSubdivision || '';
                  }
                }
              }
            } catch (bdcErr) {
              console.warn('BigDataCloud error:', bdcErr);
            }
          }

          // 3. Tertiary: India Post Verification for PIN Code
          if (detectedPin && detectedPin.length === 6) {
            try {
              const official = await lookupPostalPincode(detectedPin);
              if (official) {
                if (!detectedPlace) detectedPlace = official.place || '';
                if (!detectedCity || detectedCity === detectedPlace) detectedCity = official.city || detectedCity;
                if (!detectedState) detectedState = official.state || detectedState;
              }
            } catch (e) {
              // Ignore
            }
          }

          if (detectedPin && detectedPin.length === 6) {
            applyGPSResult(
              detectedPin,
              detectedCity || 'City',
              detectedState || 'India',
              detectedPlace || ''
            );
            return;
          }

          // If no PIN returned by GPS, check state fallback
          if (detectedState) {
            const stateObj = INDIAN_STATES.find(
              (s) =>
                s.name.toLowerCase().includes(detectedState.toLowerCase()) ||
                detectedState.toLowerCase().includes(s.name.toLowerCase())
            );
            if (stateObj) {
              applyGPSResult(stateObj.defaultPin, detectedCity || stateObj.defaultCity, stateObj.name, detectedPlace || '');
              return;
            }
          }

          await runIpFallback();
        } catch (err) {
          console.warn('GPS processing error:', err);
          await runIpFallback();
        }
      },
      async (err) => {
        console.warn('GPS error / denied:', err);
        const reason =
          err.code === 1
            ? 'Browser location access was denied. You can enter your exact area and PIN code manually below.'
            : 'GPS signal timed out. Falling back to network detection...';
        await runIpFallback(reason);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  const currentDisplayArea = place ? `${place}, ${city}` : city;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative animate-scaleUp max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-[#E31837] flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Choose Delivery Location</h3>
              <p className="text-[11px] text-gray-500">Accurate delivery across all Indian locations &amp; PIN codes</p>
            </div>
          </div>
          <button
            onClick={closeLocationModal}
            className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Current Active Location Banner */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Current Delivery Area</p>
                <p className="text-xs font-bold text-gray-900">
                  {currentDisplayArea}, {state} ({pincode})
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
              <Zap className="w-3 h-3 fill-emerald-600" />
              Express Active
            </span>
          </div>

          {/* High-Accuracy GPS Button */}
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={detecting}
            className="w-full py-2.5 px-4 rounded-xl bg-red-50 hover:bg-red-100/90 border border-red-200 text-xs font-bold text-[#E31837] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs disabled:opacity-60"
          >
            <Navigation className={`w-4 h-4 text-[#E31837] ${detecting ? 'animate-spin' : ''}`} />
            <span>{detecting ? (detectionStatus || 'Detecting Satellite GPS...') : 'Use GPS / Current Location (High Accuracy)'}</span>
          </button>

          {/* Accurate Manual Address & Locality Form */}
          <form onSubmit={handleSaveLocation} className="space-y-3 bg-gray-50/70 p-3.5 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between pb-1 border-b border-gray-200/60">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5 text-[#E31837]" />
                Enter or Edit Location Details Manually
              </span>
              <span className="text-[10px] text-gray-500 font-medium">100% Accurate</span>
            </div>

            {/* Field 1: 6-Digit PIN Code */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Indian Postal PIN Code <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  value={inputPin}
                  onChange={handlePinChange}
                  placeholder="e.g. 629163 or 560038"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent text-sm font-mono tracking-wider"
                />
              </div>
            </div>

            {/* Field 2: Area / Locality / Street (Crucial for micro-location accuracy) */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Area / Locality / Street / Landmark <span className="text-gray-400 font-normal">(e.g. Vadasery, Indiranagar, Marine Drive)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={inputPlace}
                  onChange={(e) => setInputPlace(e.target.value)}
                  placeholder="e.g. Your exact neighborhood or place"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent text-xs font-medium"
                />
              </div>
            </div>

            {/* Field 3: City / District & State Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  City / District
                </label>
                <input
                  type="text"
                  value={inputCity}
                  onChange={(e) => setInputCity(e.target.value)}
                  placeholder="e.g. Nagercoil or Bengaluru"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  State / UT
                </label>
                <select
                  value={inputState}
                  onChange={(e) => setInputState(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent text-xs font-medium"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {pinError && (
              <p className="text-xs text-[#E31837] font-semibold flex items-center gap-1 pt-0.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {pinError}
              </p>
            )}

            {resolvedInfo && (
              <div className="p-2 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs font-medium text-emerald-800">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Detected Circle: <strong>{resolvedInfo.city}</strong>, {resolvedInfo.state} (GST: {resolvedInfo.stateCode || 'Active'})</span>
              </div>
            )}

            {/* Save & Apply Location Button */}
            <button
              type="submit"
              disabled={detecting}
              className="w-full py-2.5 rounded-xl bg-[#E31837] hover:bg-[#C7122E] text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply &amp; Set Delivery Location</span>
            </button>
          </form>

          {/* Quick Popular Cities */}
          <div className="pt-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Popular Cities &amp; Centers
            </p>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_CITIES.map((c) => {
                const isActive = c.pin === pincode;
                return (
                  <button
                    key={c.pin}
                    type="button"
                    onClick={() => handleSelectQuickCity(c)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                      isActive
                        ? 'bg-[#E31837] text-white shadow-2xs'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    <span>{c.city}</span>
                    {c.place && <span className="text-[10px] opacity-75 font-normal">({c.place})</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Guarantee */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 shrink-0">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            PAN-India Express Doorstep Handover
          </span>
          <button
            type="button"
            onClick={closeLocationModal}
            className="font-bold text-gray-700 hover:text-black cursor-pointer px-2 py-1 rounded hover:bg-gray-200/50"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
