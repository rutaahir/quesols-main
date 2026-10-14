export interface CountryInfo {
  code: string;
  name: string;
  phoneCode: string;
  states: {
    name: string;
    cities: string[];
  }[];
}

export const COUNTRIES: CountryInfo[] = [
  {
    code: "IN",
    name: "India",
    phoneCode: "+91",
    states: [
      {
        name: "Gujarat",
        cities: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar", "Bhavnagar", "Jamnagar", "Junagadh", "Anand", "Other"],
      },
      {
        name: "Maharashtra",
        cities: ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane", "Aurangabad", "Navi Mumbai", "Kolhapur", "Solapur", "Other"],
      },
      {
        name: "Karnataka",
        cities: ["Bengaluru", "Mysuru", "Hubballi", "Mangaluru", "Belagavi", "Davanagere", "Ballari", "Other"],
      },
      {
        name: "Delhi",
        cities: ["New Delhi", "Central Delhi", "South Delhi", "North Delhi", "East Delhi", "West Delhi", "Other"],
      },
      {
        name: "Tamil Nadu",
        cities: ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Erode", "Vellore", "Other"],
      },
      {
        name: "Telangana",
        cities: ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam", "Ramagundam", "Other"],
      },
      {
        name: "Uttar Pradesh",
        cities: ["Lucknow", "Kanpur", "Noida", "Greater Noida", "Ghaziabad", "Varanasi", "Agra", "Prayagraj", "Meerut", "Other"],
      },
      {
        name: "Rajasthan",
        cities: ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner", "Ajmer", "Bhilwara", "Alwar", "Other"],
      },
      {
        name: "West Bengal",
        cities: ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Bardhaman", "Other"],
      },
      {
        name: "Kerala",
        cities: ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Kannur", "Alappuzha", "Other"],
      },
      {
        name: "Madhya Pradesh",
        cities: ["Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Other"],
      },
      {
        name: "Punjab",
        cities: ["Chandigarh", "Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Other"],
      },
      {
        name: "Haryana",
        cities: ["Gurugram", "Faridabad", "Panipat", "Ambala", "Karnal", "Hisar", "Rohtak", "Other"],
      },
      {
        name: "Andhra Pradesh",
        cities: ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Tirupati", "Rajahmundry", "Other"],
      },
      {
        name: "Goa",
        cities: ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda", "Other"],
      },
      {
        name: "Bihar",
        cities: ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia", "Darbhanga", "Other"],
      },
      {
        name: "Odisha",
        cities: ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri", "Other"],
      },
      {
        name: "Other State",
        cities: ["Other"],
      },
    ],
  },
  {
    code: "US",
    name: "United States",
    phoneCode: "+1",
    states: [
      {
        name: "California",
        cities: ["Los Angeles", "San Francisco", "San Diego", "San Jose", "Sacramento", "Fresno", "Oakland", "Other"],
      },
      {
        name: "New York",
        cities: ["New York City", "Buffalo", "Albany", "Rochester", "Syracuse", "Yonkers", "Other"],
      },
      {
        name: "Texas",
        cities: ["Houston", "Austin", "Dallas", "San Antonio", "Fort Worth", "El Paso", "Arlington", "Other"],
      },
      {
        name: "Florida",
        cities: ["Miami", "Orlando", "Tampa", "Jacksonville", "Tallahassee", "Fort Lauderdale", "Other"],
      },
      {
        name: "Illinois",
        cities: ["Chicago", "Aurora", "Naperville", "Rockford", "Springfield", "Peoria", "Other"],
      },
      {
        name: "Washington",
        cities: ["Seattle", "Spokane", "Tacoma", "Vancouver", "Bellevue", "Everett", "Other"],
      },
      {
        name: "Other State",
        cities: ["Other"],
      },
    ],
  },
  {
    code: "GB",
    name: "United Kingdom",
    phoneCode: "+44",
    states: [
      {
        name: "England",
        cities: ["London", "Birmingham", "Manchester", "Leeds", "Liverpool", "Bristol", "Newcastle", "Sheffield", "Other"],
      },
      {
        name: "Scotland",
        cities: ["Edinburgh", "Glasgow", "Aberdeen", "Dundee", "Inverness", "Other"],
      },
      {
        name: "Wales",
        cities: ["Cardiff", "Swansea", "Newport", "Wrexham", "Other"],
      },
      {
        name: "Northern Ireland",
        cities: ["Belfast", "Derry", "Lisburn", "Newry", "Other"],
      },
    ],
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    phoneCode: "+971",
    states: [
      {
        name: "Dubai",
        cities: ["Dubai City", "Deira", "Bur Dubai", "Jumeirah", "Downtown", "Business Bay", "Dubai Marina", "Other"],
      },
      {
        name: "Abu Dhabi",
        cities: ["Abu Dhabi City", "Al Ain", "Al Dhafra", "Yas Island", "Other"],
      },
      {
        name: "Sharjah",
        cities: ["Sharjah City", "Khor Fakkan", "Kalba", "Al Dhaid", "Other"],
      },
      {
        name: "Ajman",
        cities: ["Ajman City", "Masfout", "Al Manama", "Other"],
      },
      {
        name: "Ras Al Khaimah",
        cities: ["Ras Al Khaimah City", "Al Jazirah Al Hamra", "Other"],
      },
      {
        name: "Fujairah",
        cities: ["Fujairah City", "Dibba Al-Fujairah", "Other"],
      },
    ],
  },
  {
    code: "CA",
    name: "Canada",
    phoneCode: "+1",
    states: [
      {
        name: "Ontario",
        cities: ["Toronto", "Ottawa", "Mississauga", "Hamilton", "Brampton", "London", "Markham", "Other"],
      },
      {
        name: "British Columbia",
        cities: ["Vancouver", "Victoria", "Surrey", "Burnaby", "Richmond", "Kelowna", "Other"],
      },
      {
        name: "Quebec",
        cities: ["Montreal", "Quebec City", "Laval", "Gatineau", "Longueuil", "Other"],
      },
      {
        name: "Alberta",
        cities: ["Calgary", "Edmonton", "Red Deer", "Lethbridge", "Other"],
      },
      {
        name: "Other Province",
        cities: ["Other"],
      },
    ],
  },
  {
    code: "AU",
    name: "Australia",
    phoneCode: "+61",
    states: [
      {
        name: "New South Wales",
        cities: ["Sydney", "Newcastle", "Central Coast", "Wollongong", "Other"],
      },
      {
        name: "Victoria",
        cities: ["Melbourne", "Geelong", "Ballarat", "Bendigo", "Other"],
      },
      {
        name: "Queensland",
        cities: ["Brisbane", "Gold Coast", "Sunshine Coast", "Townsville", "Cairns", "Other"],
      },
      {
        name: "Western Australia",
        cities: ["Perth", "Mandurah", "Bunbury", "Other"],
      },
      {
        name: "Other State",
        cities: ["Other"],
      },
    ],
  },
  {
    code: "SG",
    name: "Singapore",
    phoneCode: "+65",
    states: [
      {
        name: "Singapore",
        cities: ["Central", "Jurong", "Tampines", "Woodlands", "Yishun", "Ang Mo Kio", "Other"],
      },
    ],
  },
  {
    code: "DE",
    name: "Germany",
    phoneCode: "+49",
    states: [
      {
        name: "Berlin",
        cities: ["Berlin City", "Mitte", "Charlottenburg", "Other"],
      },
      {
        name: "Bavaria",
        cities: ["Munich", "Nuremberg", "Augsburg", "Regensburg", "Other"],
      },
      {
        name: "North Rhine-Westphalia",
        cities: ["Cologne", "Dusseldorf", "Dortmund", "Essen", "Bonn", "Other"],
      },
      {
        name: "Other State",
        cities: ["Other"],
      },
    ],
  },
  {
    code: "SA",
    name: "Saudi Arabia",
    phoneCode: "+966",
    states: [
      {
        name: "Riyadh",
        cities: ["Riyadh City", "Al Kharj", "Ad Diriyah", "Other"],
      },
      {
        name: "Makkah",
        cities: ["Jeddah", "Mecca", "Taif", "Other"],
      },
      {
        name: "Eastern Province",
        cities: ["Dammam", "Khobar", "Jubail", "Dhahran", "Other"],
      },
      {
        name: "Other Region",
        cities: ["Other"],
      },
    ],
  },
  {
    code: "OTHER",
    name: "Other Country",
    phoneCode: "+1",
    states: [
      {
        name: "Other State/Province",
        cities: ["Other"],
      },
    ],
  },
];

export const PHONE_COUNTRY_CODES = [
  { code: "+91", label: "+91 (India)", flag: "🇮🇳" },
  { code: "+1", label: "+1 (US/Canada)", flag: "🇺🇸" },
  { code: "+44", label: "+44 (UK)", flag: "🇬🇧" },
  { code: "+971", label: "+971 (UAE)", flag: "🇦🇪" },
  { code: "+61", label: "+61 (Australia)", flag: "🇦🇺" },
  { code: "+65", label: "+65 (Singapore)", flag: "🇸🇬" },
  { code: "+49", label: "+49 (Germany)", flag: "🇩🇪" },
  { code: "+966", label: "+966 (Saudi Arabia)", flag: "🇸🇦" },
  { code: "+33", label: "+33 (France)", flag: "🇫🇷" },
  { code: "+81", label: "+81 (Japan)", flag: "🇯🇵" },
  { code: "+86", label: "+86 (China)", flag: "🇨🇳" },
  { code: "+974", label: "+974 (Qatar)", flag: "🇶🇦" },
  { code: "+968", label: "+968 (Oman)", flag: "🇴🇲" },
  { code: "+965", label: "+965 (Kuwait)", flag: "🇰🇼" },
  { code: "+973", label: "+973 (Bahrain)", flag: "🇧🇭" },
];
