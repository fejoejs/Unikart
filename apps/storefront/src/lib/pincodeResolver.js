// Comprehensive Indian Postal Circles & State Mapping (All 28 States & 8 Union Territories)
export const INDIAN_STATES = [
  { code: '01', name: 'Jammu & Kashmir', defaultCity: 'Srinagar', defaultPin: '190001' },
  { code: '02', name: 'Himachal Pradesh', defaultCity: 'Shimla', defaultPin: '171001' },
  { code: '03', name: 'Punjab', defaultCity: 'Amritsar', defaultPin: '143001' },
  { code: '04', name: 'Chandigarh', defaultCity: 'Chandigarh', defaultPin: '160001' },
  { code: '05', name: 'Uttarakhand', defaultCity: 'Dehradun', defaultPin: '248001' },
  { code: '06', name: 'Haryana', defaultCity: 'Gurugram', defaultPin: '122001' },
  { code: '07', name: 'Delhi', defaultCity: 'New Delhi', defaultPin: '110001' },
  { code: '08', name: 'Rajasthan', defaultCity: 'Jaipur', defaultPin: '302001' },
  { code: '09', name: 'Uttar Pradesh', defaultCity: 'Lucknow', defaultPin: '226001' },
  { code: '10', name: 'Bihar', defaultCity: 'Patna', defaultPin: '800001' },
  { code: '11', name: 'Sikkim', defaultCity: 'Gangtok', defaultPin: '737101' },
  { code: '12', name: 'Arunachal Pradesh', defaultCity: 'Itanagar', defaultPin: '791111' },
  { code: '13', name: 'Nagaland', defaultCity: 'Kohima', defaultPin: '797001' },
  { code: '14', name: 'Manipur', defaultCity: 'Imphal', defaultPin: '795001' },
  { code: '15', name: 'Mizoram', defaultCity: 'Aizawl', defaultPin: '796001' },
  { code: '16', name: 'Tripura', defaultCity: 'Agartala', defaultPin: '799001' },
  { code: '17', name: 'Meghalaya', defaultCity: 'Shillong', defaultPin: '793001' },
  { code: '18', name: 'Assam', defaultCity: 'Guwahati', defaultPin: '781001' },
  { code: '19', name: 'West Bengal', defaultCity: 'Kolkata', defaultPin: '700001' },
  { code: '20', name: 'Jharkhand', defaultCity: 'Ranchi', defaultPin: '834001' },
  { code: '21', name: 'Odisha', defaultCity: 'Bhubaneswar', defaultPin: '751001' },
  { code: '22', name: 'Chhattisgarh', defaultCity: 'Raipur', defaultPin: '492001' },
  { code: '23', name: 'Madhya Pradesh', defaultCity: 'Bhopal', defaultPin: '462001' },
  { code: '24', name: 'Gujarat', defaultCity: 'Ahmedabad', defaultPin: '380001' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu', defaultCity: 'Daman', defaultPin: '396210' },
  { code: '27', name: 'Maharashtra', defaultCity: 'Mumbai', defaultPin: '400001' },
  { code: '29', name: 'Karnataka', defaultCity: 'Bengaluru', defaultPin: '560001' },
  { code: '30', name: 'Goa', defaultCity: 'Panaji', defaultPin: '403001' },
  { code: '31', name: 'Lakshadweep', defaultCity: 'Kavaratti', defaultPin: '682555' },
  { code: '32', name: 'Kerala', defaultCity: 'Thiruvananthapuram', defaultPin: '695001' },
  { code: '33', name: 'Tamil Nadu', defaultCity: 'Chennai', defaultPin: '600001' },
  { code: '34', name: 'Puducherry', defaultCity: 'Puducherry', defaultPin: '605001' },
  { code: '35', name: 'Andaman & Nicobar Islands', defaultCity: 'Port Blair', defaultPin: '744101' },
  { code: '36', name: 'Telangana', defaultCity: 'Hyderabad', defaultPin: '500001' },
  { code: '37', name: 'Andhra Pradesh', defaultCity: 'Visakhapatnam', defaultPin: '530001' },
  { code: '38', name: 'Ladakh', defaultCity: 'Leh', defaultPin: '194101' }
];

// Resolves 6-digit pincode prefix to accurate State, GST Code & City
export function resolvePincodePrefix(pin) {
  if (!pin || pin.length < 2) return null;
  const p2 = pin.substring(0, 2);
  const p3 = pin.substring(0, 3);
  const p2Num = parseInt(p2, 10);
  const p3Num = parseInt(p3, 10);

  // Specific 3-digit city and union territory matches
  if (p3 === '695') return { city: 'Thiruvananthapuram', place: 'Palayam', state: 'Kerala', stateCode: '32' };
  if (p3 === '682') {
    if (pin.startsWith('68255')) return { city: 'Kavaratti', place: 'Kavaratti', state: 'Lakshadweep', stateCode: '31' };
    return { city: 'Kochi', place: 'Marine Drive', state: 'Kerala', stateCode: '32' };
  }
  if (p3 === '673') return { city: 'Kozhikode', place: 'Mananchira', state: 'Kerala', stateCode: '32' };
  if (p3 === '560') return { city: 'Bengaluru', place: 'MG Road', state: 'Karnataka', stateCode: '29' };
  if (p3 === '575') return { city: 'Mangalore', place: 'Hampankatta', state: 'Karnataka', stateCode: '29' };
  if (p3 === '400') return { city: 'Mumbai', place: 'Fort', state: 'Maharashtra', stateCode: '27' };
  if (p3 === '411') return { city: 'Pune', place: 'Shivajinagar', state: 'Maharashtra', stateCode: '27' };
  if (p3 === '440') return { city: 'Nagpur', place: 'Sitabuldi', state: 'Maharashtra', stateCode: '27' };
  if (p3 === '600') return { city: 'Chennai', place: 'T. Nagar', state: 'Tamil Nadu', stateCode: '33' };
  if (p3 === '605') return { city: 'Puducherry', place: 'White Town', state: 'Puducherry', stateCode: '34' };
  if (p3 === '629') return { city: 'Nagercoil', place: '', state: 'Tamil Nadu', stateCode: '33' };
  if (p3 === '625') return { city: 'Madurai', place: 'Meenakshi Amman', state: 'Tamil Nadu', stateCode: '33' };
  if (p3 === '641') return { city: 'Coimbatore', place: 'RS Puram', state: 'Tamil Nadu', stateCode: '33' };
  if (p3 === '500') return { city: 'Hyderabad', place: 'Banjara Hills', state: 'Telangana', stateCode: '36' };
  if (p3 === '530') return { city: 'Visakhapatnam', place: 'Siripuram', state: 'Andhra Pradesh', stateCode: '37' };
  if (p3 === '520') return { city: 'Vijayawada', place: 'Benz Circle', state: 'Andhra Pradesh', stateCode: '37' };
  if (p3 === '700') return { city: 'Kolkata', place: 'Park Street', state: 'West Bengal', stateCode: '19' };
  if (p3 === '737') return { city: 'Gangtok', place: 'MG Marg', state: 'Sikkim', stateCode: '11' };
  if (p3 === '744') return { city: 'Port Blair', place: 'Aberdeen Bazaar', state: 'Andaman & Nicobar Islands', stateCode: '35' };
  if (p3 === '380') return { city: 'Ahmedabad', place: 'Navrangpura', state: 'Gujarat', stateCode: '24' };
  if (p3 === '395') return { city: 'Surat', place: 'Adajan', state: 'Gujarat', stateCode: '24' };
  if (p3 === '396') return { city: 'Daman', place: 'Nani Daman', state: 'Dadra & Nagar Haveli and Daman & Diu', stateCode: '26' };
  if (p3 === '302') return { city: 'Jaipur', place: 'Malviya Nagar', state: 'Rajasthan', stateCode: '08' };
  if (p3 === '226') return { city: 'Lucknow', place: 'Hazratganj', state: 'Uttar Pradesh', stateCode: '09' };
  if (p3 === '201') return { city: 'Noida', place: 'Sector 18', state: 'Uttar Pradesh', stateCode: '09' };
  if (p3 === '800') return { city: 'Patna', place: 'Fraser Road', state: 'Bihar', stateCode: '10' };
  if (p3 === '834') return { city: 'Ranchi', place: 'Main Road', state: 'Jharkhand', stateCode: '20' };
  if (p3 === '751') return { city: 'Bhubaneswar', place: 'Saheed Nagar', state: 'Odisha', stateCode: '21' };
  if (p3 === '492') return { city: 'Raipur', place: 'Pandri', state: 'Chhattisgarh', stateCode: '22' };
  if (p3 === '122') return { city: 'Gurugram', place: 'Cyber City', state: 'Haryana', stateCode: '06' };
  if (p3 === '160') return { city: 'Chandigarh', place: 'Sector 17', state: 'Chandigarh', stateCode: '04' };
  if (p3 === '194') return { city: 'Leh', place: 'Main Bazaar', state: 'Ladakh', stateCode: '38' };

  // Accurate North-East 79x Disambiguation (India Post Circles)
  if (p2 === '79') {
    if (p3Num >= 790 && p3Num <= 792) return { city: 'Itanagar', state: 'Arunachal Pradesh', stateCode: '12' };
    if (p3Num >= 793 && p3Num <= 794) return { city: 'Shillong', state: 'Meghalaya', stateCode: '17' };
    if (p3 === '795') return { city: 'Imphal', state: 'Manipur', stateCode: '14' };
    if (p3 === '796') return { city: 'Aizawl', state: 'Mizoram', stateCode: '15' };
    if (p3Num >= 797 && p3Num <= 798) return { city: 'Kohima', state: 'Nagaland', stateCode: '13' };
    if (p3 === '799') return { city: 'Agartala', state: 'Tripura', stateCode: '16' };
    return { city: 'Itanagar', state: 'Arunachal Pradesh', stateCode: '12' };
  }

  // 2-digit Circle prefix mappings
  if (p2 === '11') return { city: 'New Delhi', state: 'Delhi', stateCode: '07' };
  if (p2Num >= 12 && p2Num <= 13) return { city: 'Haryana', state: 'Haryana', stateCode: '06' };
  if (p2Num >= 14 && p2Num <= 15) return { city: 'Punjab', state: 'Punjab', stateCode: '03' };
  if (p2 === '16') return { city: 'Chandigarh', state: 'Chandigarh', stateCode: '04' };
  if (p2 === '17') return { city: 'Himachal', state: 'Himachal Pradesh', stateCode: '02' };
  if (p2 === '18' || p2 === '19') {
    if (p3 === '194') return { city: 'Leh', state: 'Ladakh', stateCode: '38' };
    return { city: 'Srinagar / Jammu', state: 'Jammu & Kashmir', stateCode: '01' };
  }
  if (p2Num >= 20 && p2Num <= 28) return { city: 'Uttar Pradesh', state: 'Uttar Pradesh', stateCode: '09' };
  if (p2Num >= 30 && p2Num <= 34) return { city: 'Rajasthan', state: 'Rajasthan', stateCode: '08' };
  if (p2Num >= 36 && p2Num <= 39) return { city: 'Gujarat', state: 'Gujarat', stateCode: '24' };
  if (p2Num >= 40 && p2Num <= 44) return { city: 'Maharashtra', state: 'Maharashtra', stateCode: '27' };
  if (p2Num >= 45 && p2Num <= 48) return { city: 'Madhya Pradesh', state: 'Madhya Pradesh', stateCode: '23' };
  if (p2 === '49') return { city: 'Raipur', state: 'Chhattisgarh', stateCode: '22' };
  if (p2Num >= 50 && p2Num <= 53) {
    if (p2 === '50') return { city: 'Hyderabad', state: 'Telangana', stateCode: '36' };
    return { city: 'Andhra Pradesh', state: 'Andhra Pradesh', stateCode: '37' };
  }
  if (p2Num >= 56 && p2Num <= 59) return { city: 'Karnataka', state: 'Karnataka', stateCode: '29' };
  if (p2Num >= 60 && p2Num <= 66) {
    if (p3 === '605') return { city: 'Puducherry', state: 'Puducherry', stateCode: '34' };
    return { city: 'Tamil Nadu', state: 'Tamil Nadu', stateCode: '33' };
  }
  if (p2Num >= 67 && p2Num <= 69) return { city: 'Kerala', state: 'Kerala', stateCode: '32' };
  if (p2Num >= 70 && p2Num <= 74) {
    if (p3 === '737') return { city: 'Gangtok', state: 'Sikkim', stateCode: '11' };
    if (p3 === '744') return { city: 'Port Blair', state: 'Andaman & Nicobar Islands', stateCode: '35' };
    return { city: 'West Bengal', state: 'West Bengal', stateCode: '19' };
  }
  if (p2Num >= 75 && p2Num <= 77) return { city: 'Odisha', state: 'Odisha', stateCode: '21' };
  if (p2 === '78') return { city: 'Assam', state: 'Assam', stateCode: '18' };
  if (p2Num >= 80 && p2Num <= 85) {
    if (p2Num >= 81 && p2Num <= 83) return { city: 'Jharkhand', state: 'Jharkhand', stateCode: '20' };
    return { city: 'Bihar', state: 'Bihar', stateCode: '10' };
  }

  return { city: 'India', state: 'All States', stateCode: '99' };
}

// Authoritative Postal Pincode Lookup via India Post directory API with local fallback
export async function lookupPostalPincode(pin) {
  if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) return null;
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.Status === 'Success' && Array.isArray(data[0]?.PostOffice) && data[0].PostOffice.length > 0) {
        const po = data[0].PostOffice[0];
        const stateName = po.State || '';
        const matchingState = INDIAN_STATES.find(s => s.name.toLowerCase() === stateName.toLowerCase());
        const district = po.District || '';
        const poName = po.Name || '';
        const finalCity = district || poName || 'City';
        const finalPlace = (poName && poName.toLowerCase() !== finalCity.toLowerCase()) ? poName : (po.Block || poName);
        return {
          city: finalCity,
          place: finalPlace,
          state: stateName || 'India',
          stateCode: matchingState?.code || '99',
          district: po.District,
          postOffice: po.Name,
          isOfficialLookup: true
        };
      }
    }
  } catch (err) {
    // Fallback to local circle resolver
  }
  return resolvePincodePrefix(pin);
}
