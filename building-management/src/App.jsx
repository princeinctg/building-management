import { useState, useEffect, useContext, createContext, useRef } from 'react';
import { 
  initializeApp 
} from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  onSnapshot
} from 'firebase/firestore';
import { 
  Menu, X, User, LayoutDashboard, 
  Building, MapPin, ChevronLeft, ChevronRight, 
  CreditCard, FileText, Bell, Users, Tag, ShieldCheck,
  Check
} from 'lucide-react';

// --- Configuration & Constants ---

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAaJZTkXQNi1GR2M0QY52MTfhfQVcucal0",
  authDomain: "building-management-dbc94.firebaseapp.com",
  projectId: "building-management-dbc94",
  storageBucket: "building-management-dbc94.firebasestorage.app",
  messagingSenderId: "949071946772",
  appId: "1:949071946772:web:7cbc1642b4a1f92475b301",
  measurementId: "G-375FG4YSMJ"
};

const app = initializeApp(firebaseConfig);
// Removed unused analytics variable
const auth = getAuth(app);
const db = getFirestore(app);
// Use a hardcoded appId or environment variable instead of __app_id
const appId = 'default-app-id';

// Helper for strict paths
// Note: When using your own Firebase, you might not strictly need 'artifacts/{appId}/...' 
// but we keep it to ensure the structure remains consistent with your code logic.
const getCollectionPath = (collName, isPrivate = false, uid = '') => {
  if (isPrivate) {
    return `artifacts/${appId}/users/${uid}/${collName}`;
  }
  return `artifacts/${appId}/public/data/${collName}`;
};

// --- Contexts ---
const AuthContext = createContext(null);
const ToastContext = createContext(null);

// --- Toast Component ---
const ToastContainer = ({ toasts, removeToast }) => (
  <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
    {toasts.map((toast) => (
      <div 
        key={toast.id} 
        className={`px-4 py-3 rounded shadow-lg text-white flex items-center gap-2 transform transition-all duration-300 ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-green-600'
        }`}
      >
        <span>{toast.message}</span>
        <button onClick={() => removeToast(toast.id)} className="ml-2 hover:text-gray-200"><X size={14}/></button>
      </div>
    ))}
  </div>
);

// --- Main App Component ---
export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null); // Stores role and extra data
  // Removed unused loading state
  const [currentPage, setCurrentPage] = useState('home');
  const [toasts, setToasts] = useState([]);

  // Toast Helper
  const toastIdRef = useRef(0);
  const showToast = (message, type = 'success') => {
    toastIdRef.current += 1;
    const id = `toast-${toastIdRef.current}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Auth Initialization
  useEffect(() => {
    // Note: With custom Firebase config, we do NOT use the environment's auto-login tokens
    // because they don't match your specific project's signature.
    // The app will start unauthenticated and wait for user to Login/Register.
    
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch User Role Data from Firestore
        // We use a public 'users' collection for roles/profiles for simplicity in this demo structure
        // In a real app, strict rules would apply. 
        // Here we simulate "users" collection in public/data for shared access by Admin
        const q = query(collection(db, getCollectionPath('users')), where("uid", "==", currentUser.uid));
        
        try {
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
            setUserData(querySnapshot.docs[0].data());
            } else {
            // Create initial user doc if not exists
            // First user is Admin for demo purposes
            const userCountSnapshot = await getDocs(collection(db, getCollectionPath('users')));
            const isFirstUser = userCountSnapshot.empty;
            
            const newUserData = {
                uid: currentUser.uid,
                name: currentUser.displayName || 'User',
                email: currentUser.email,
                photoURL: currentUser.photoURL,
                role: isFirstUser ? 'admin' : 'user',
                agreementDate: null,
                rentedApartment: null
            };
            
            await addDoc(collection(db, getCollectionPath('users')), newUserData);
            setUserData(newUserData);
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            // Handle permission errors gracefully
            setUserData(null);
        }
      } else {
        setUserData(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Router / Navigation Helper ---
  const navigate = (page) => {
  window.scrollTo(0,0);
  setCurrentPage(page);
};

  // --- Views Rendering ---
  const renderPage = () => {
  switch(currentPage) {
    case 'home': return <HomePage />;
    case 'login': return <Login />;
    case 'register': return <Register />;
    case 'apartments': return <Apartments />;
    case 'dashboard': return <Dashboard />;
    default: return <HomePage />;
  }
};

  return (
    <AuthContext.Provider value={{ user, userData, setUserData }}>
      <ToastContext.Provider value={{ showToast }}>
        <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
          <Navbar navigate={navigate} currentPage={currentPage} />
          <main className="pt-16 min-h-[calc(100vh-200px)]">
            {renderPage()}
          </main>
          <Footer />
          <ToastContainer toasts={toasts} removeToast={removeToast} />
        </div>
      </ToastContext.Provider>
    </AuthContext.Provider>
  );
}

// --- Components ---

const Navbar = ({ navigate, currentPage }) => {
  const { user, userData } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('home');
  };

  return (
    <nav className="fixed top-0 w-full bg-white shadow-md z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center cursor-pointer" onClick={() => navigate('home')}>
            <Building className="h-8 w-8 text-blue-600 mr-2" />
            <span className="font-bold text-xl tracking-tight text-gray-900">SkyView<span className="text-blue-600">Residency</span></span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <button onClick={() => navigate('home')} className={`${currentPage === 'home' ? 'text-blue-600' : 'text-gray-600'} hover:text-blue-600 font-medium`}>Home</button>
            <button onClick={() => navigate('apartments')} className={`${currentPage === 'apartments' ? 'text-blue-600' : 'text-gray-600'} hover:text-blue-600 font-medium`}>Apartments</button>
            
            {!user ? (
              <button onClick={() => navigate('login')} className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition">
                <User size={18} className="mr-2" /> Login
              </button>
            ) : (
              <div className="relative">
                <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center focus:outline-none">
                  <img 
                    src={user.photoURL || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"} 
                    alt="Profile" 
                    className="h-9 w-9 rounded-full border border-gray-300 object-cover"
                  />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 border border-gray-100">
                    <div className="px-4 py-2 text-sm text-gray-700 font-bold border-b bg-gray-50">{userData?.name || user.displayName}</div>
                    <button onClick={() => { navigate('dashboard'); setProfileOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Dashboard</button>
                    <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">Logout</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setMenuOpen(!menuOpen)} className="text-gray-600 hover:text-blue-600 focus:outline-none">
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <button onClick={() => {navigate('home'); setMenuOpen(false)}} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 w-full text-left">Home</button>
            <button onClick={() => {navigate('apartments'); setMenuOpen(false)}} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 w-full text-left">Apartments</button>
            {!user ? (
               <button onClick={() => {navigate('login'); setMenuOpen(false)}} className="block px-3 py-2 rounded-md text-base font-medium text-blue-600 hover:bg-blue-50 w-full text-left">Login</button>
            ) : (
              <>
                <button onClick={() => {navigate('dashboard'); setMenuOpen(false)}} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 w-full text-left">Dashboard</button>
                <button onClick={handleLogout} className="block px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 w-full text-left">Logout</button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

const Banner = () => {
  const images = [
    "https://i.ibb.co.com/jPDhxtyY/Lucid-Origin-Luxury-Living-Redefined-a-lavish-apartment-interi-3.jpg",
    "https://i.ibb.co.com/KzRmYQ2B/Lucid-Origin-Luxury-Living-Redefined-a-sleek-and-modern-apartm-3.jpg",
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&q=80&w=1600"
  ];
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [images.length]);

  
  return (
    <div className="relative h-[400px] md:h-[500px] overflow-hidden">
      {images.map((img, index) => (
        <div 
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === current ? 'opacity-100' : 'opacity-0'}`}
        >
          <img src={img} alt="Building" className="w-full h-full object-cover" />
           <a href="https://i.ibb.co.com/jPDhxtyY/Lucid-Origin-Luxury-Living-Redefined-a-lavish-apartment-interi-3.jpg"></a>
          <div className="absolute inset-0  bg-opacity-40 flex items-center justify-center">
            <div className="text-center text-white px-4">
             <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">Luxury Living Redefined</h1>
              <p className="text-lg md:text-xl font-light">Experience the pinnacle of comfort and style.</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};


const HomePage = () => {
  const [coupons, setCoupons] = useState([]);

  useEffect(() => {
    const fetchCoupons = async () => {
      const q = query(collection(db, getCollectionPath('coupons')));
      try {
        const snap = await getDocs(q);
        const allCoupons = snap.docs.map(d => d.data());
        const availableCoupons = allCoupons.filter(c => c.isAvailable === true);
        setCoupons(availableCoupons);
      } catch (e) {
          console.error("Error fetching coupons:", e);
      }
    };
    fetchCoupons();
  }, []);

  return (
    <div className="animate-fade-in">
      <Banner />

      {/* About Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">About The Building</h2>
          <p className="text-lg text-gray-600 leading-relaxed font-serif">
            Welcome to <span className="text-blue-600 font-semibold">SkyView Residency</span>, a masterpiece of modern architecture. 
            Nestled in the heart of the city, our building offers a sanctuary of peace with state-of-the-art amenities. 
            From our rooftop infinity pool to the 24/7 concierge service, every detail is designed to elevate your lifestyle.
          </p>
        </div>
      </section>

      {/* Coupons Section */}
      {coupons.length > 0 && (
        <section className="py-12 bg-blue-50">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-8 flex items-center justify-center gap-2">
              <Tag className="text-blue-600"/> Exclusive Offers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {coupons.map((coupon, idx) => (
                <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500 relative overflow-hidden group hover:shadow-md transition">
                  <div className="absolute -right-6 -top-6 bg-blue-100 w-24 h-24 rounded-full group-hover:bg-blue-200 transition"></div>
                  <h3 className="text-2xl font-bold text-gray-800">{coupon.discount}% OFF</h3>
                  <p className="text-gray-600 text-sm mt-1">{coupon.description}</p>
                  <div className="mt-4 bg-gray-100 inline-block px-3 py-1 rounded text-sm font-mono tracking-widest text-blue-800 border border-blue-200">
                    {coupon.code}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Location Section */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row gap-8 items-center">
          <div className="w-full md:w-1/2">
            <h2 className="text-3xl font-bold mb-4">Prime Location</h2>
            <p className="text-gray-600 mb-4">
              Located at 123 Skyline Avenue, we are just minutes away from the central business district and the finest dining spots.
            </p>
            <div className="flex items-start gap-3 mb-2">
              <MapPin className="text-red-500 mt-1" />
              <span>123 Skyline Ave, Metro City, 54321</span>
            </div>
            <p className="text-sm text-gray-500 italic">"Accessible by all major transit lines."</p>
          </div>
          <div className="w-full md:w-1/2 h-64 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden relative">
             <img src="https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?auto=format&fit=crop&q=80&w=800" alt="Map" className="w-full h-full object-cover opacity-80" />
             <div className="absolute bg-white px-4 py-2 rounded shadow font-bold">Map View Placeholder</div>
          </div>
        </div>
      </section>
    </div>
  );
};

const Footer = () => {
    const { showToast } = useContext(ToastContext);
    
    
    const seedData = async () => {
        const aptColl = collection(db, getCollectionPath('apartments'));
        const couponColl = collection(db, getCollectionPath('coupons'));
        
        // Apartments
        const apartments = Array.from({ length: 12 }).map((_, i) => ({
            floor: Math.floor(i / 4) + 1,
            block: i % 2 === 0 ? 'A' : 'B',
            apartmentNo: 100 + i + 1,
            rent: 1500 + (i * 100),
            image: `https://i.ibb.co.com/jPDhxtyY/Lucid-Origin-Luxury-Living-Redefined-a-lavish-apartment-interi-3.jpg`
        }));
        
        // Mock Coupons
        const coupons = [
            { code: 'WELCOME20', discount: 20, description: 'New member discount', isAvailable: true },
            { code: 'FALL10', discount: 10, description: 'Autumn Special', isAvailable: true }
        ];

        try {
            const snap = await getDocs(aptColl);
            if(snap.empty) {
                apartments.forEach(async (apt) => await addDoc(aptColl, apt));
                coupons.forEach(async (cpn) => await addDoc(couponColl, cpn));
                showToast("Database seeded successfully!", "success");
            } else {
                showToast("Database already has data.", "error");
            }
        } catch (e) {
            console.error(e);
            showToast("Seed failed: " + e.message, "error");
        }
    }

  return (
    <footer className="bg-gray-900 text-white py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="text-xl font-bold mb-4">SkyView Residency</h3>
          <p className="text-gray-400 text-sm">Elevating your living experience with premium amenities and community.</p>
        </div>
        <div>
          <h3 className="text-xl font-bold mb-4">Quick Links</h3>
          <ul className="text-gray-400 text-sm space-y-2">
            <li>About Us</li>
            <li>Apartments</li>
            <li>Contact</li>
            <li>Terms & Conditions</li>
          </ul>
        </div>
        <div>
          <h3 className="text-xl font-bold mb-4">Connect</h3>
          <div className="flex space-x-4">
            {/* Social Icons Placeholder */}
            <div className="w-8 h-8 bg-gray-700 rounded-full hover:bg-blue-600 transition"></div>
            <div className="w-8 h-8 bg-gray-700 rounded-full hover:bg-blue-600 transition"></div>
            <div className="w-8 h-8 bg-gray-700 rounded-full hover:bg-blue-600 transition"></div>
          </div>
          <button onClick={seedData} className="mt-6 text-xs text-gray-700 hover:text-gray-500">Seed Database (Dev Only)</button>
        </div>
      </div>
      <div className="text-center mt-10 text-gray-600 text-xs">
        &copy; 2024 SkyView Residency. All rights reserved.
      </div>
    </footer>
  );
};

// --- Auth Components ---

const Login = ({ navigate, showToast }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showToast("Logged in successfully!");
      navigate('home');
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      showToast("Logged in with Google!");
      navigate('home');
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  return (
    <div className="flex justify-center items-center py-20 px-4 bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Welcome Back</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input 
              type="email" required 
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" 
              value={email} onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input 
              type="password" required 
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" 
              value={password} onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition">Login</button>
        </form>
        <div className="mt-4 flex items-center justify-between">
            <span className="border-b w-1/5 lg:w-1/4"></span>
            <span className="text-xs text-center text-gray-500 uppercase">or login with</span>
            <span className="border-b w-1/5 lg:w-1/4"></span>
        </div>
        <button onClick={handleGoogleLogin} className="mt-4 w-full bg-red-50 text-red-600 border border-red-200 py-2 rounded-md hover:bg-red-100 transition flex items-center justify-center gap-2">
            Google
        </button>
        <p className="mt-4 text-center text-sm text-gray-600">
          Don't have an account? <span onClick={() => navigate('register')} className="text-blue-600 cursor-pointer hover:underline">Register</span>
        </p>
      </div>
    </div>
  );
};

const Register = ({ navigate, showToast }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [photoURL, setPhotoURL] = useState('');

  const validatePassword = (pwd) => {
    return pwd.length >= 6 && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validatePassword(password)) {
      showToast("Password must have 6+ chars, 1 uppercase, 1 lowercase", "error");
      return;
    }
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: name, photoURL: photoURL || "https://api.dicebear.com/7.x/avataaars/svg" });
      
      showToast("Registered successfully!");
      navigate('home');
    } catch (error) {
      console.error("Sign up error:", error);
      showToast(error.message, "error");
    }
  };

  return (
    <div className="flex justify-center items-center py-20 px-4 bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Create Account</h2>
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input type="text" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
           <div>
            <label className="block text-sm font-medium text-gray-700">Photo URL (Optional)</label>
            <input type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" value={photoURL} onChange={e => setPhotoURL(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input type="password" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" value={password} onChange={e => setPassword(e.target.value)} />
            <p className="text-xs text-gray-500 mt-1">Must be 6 chars, incl Upper & Lower case.</p>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition">Register</button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account? <span onClick={() => navigate('login')} className="text-blue-600 cursor-pointer hover:underline">Login</span>
        </p>
      </div>
    </div>
  );
};

// --- Apartment Section ---

const Apartments = ({ navigate, showToast, user, userData }) => {
  const [apartments, setApartments] = useState([]);
  const [minRent, setMinRent] = useState(0);
  const [maxRent, setMaxRent] = useState(100000);
  const [page, setPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    const fetchApts = async () => {
      const q = query(collection(db, getCollectionPath('apartments')));
      try {
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({id: d.id, ...d.data()}));
        setApartments(data);
      } catch (e) {
          console.error(e);
      }
    };
    fetchApts();
  }, []);


  const filtered = apartments.filter(a => a.rent >= minRent && a.rent <= maxRent);
  

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  let paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  
  while (paginated.length < itemsPerPage) {
    paginated.push({
      id: `placeholder-${paginated.length}`,
      image: 'https://placehold.co/400x300?text=No+Apartment',
      block: 'B',
      apartmentNo: '6',
      rent: '100000',
      floor: '-',
      status: 'Unavailable',
      isPlaceholder: true
    });
  }

  const handleAgreement = async (apt) => {
    if (!user) {
      showToast("Please login first", "error");
      navigate('login');
      return;
    }
    if (userData?.role === 'admin') {
        showToast("Admins cannot apply for agreements.", "error");
        return;
    }

    const q = query(collection(db, getCollectionPath('agreements'))); 
    
    try {
        const snap = await getDocs(q);
        const myRequests = snap.docs
            .map(d => d.data())
            .filter(d => d.userEmail === user.email && d.status === 'pending');

        if (myRequests.length > 0) {
            showToast("You already have a pending request.", "error");
            return;
        }

        await addDoc(collection(db, getCollectionPath('agreements')), {
            userName: user.displayName,
            userEmail: user.email,
            userId: user.uid, 
            floor: apt.floor,
            block: apt.block,
            apartmentNo: apt.apartmentNo,
            rent: apt.rent,
            status: 'pending',
            requestDate: new Date().toISOString()
        });
        showToast("Agreement request submitted!");
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Search Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
        <h2 className="text-2xl font-bold">Available Apartments</h2>
        <div className="flex gap-2 items-center">
            <span className="text-sm font-semibold">Rent:</span>
            <input 
                type="number" placeholder="Min" 
                className="border rounded p-2 w-24"
                value={minRent} onChange={e => setMinRent(Number(e.target.value))}
            />
            <span>-</span>
            <input 
                type="number" placeholder="Max" 
                className="border rounded p-2 w-24"
                value={maxRent} onChange={e => setMaxRent(Number(e.target.value))}
            />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginated.map(apt => (
          <div key={apt.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition">
            <img src={apt.image} alt="Apt" className="w-full h-48 object-cover" />
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold">Block {apt.block} - Apt {apt.apartmentNo}</h3>
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold">${apt.rent}/mo</span>
              </div>
              <div className="text-sm text-gray-600 space-y-1 mb-4">
                <p>Floor: {apt.floor}</p>
                <p>Status: Available</p>
              </div>
              <button 
                onClick={() => handleAgreement(apt)}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
              >
                Agreement
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8 gap-2">
          <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="p-2 border rounded disabled:opacity-50"><ChevronLeft/></button>
          <span className="p-2 font-bold">Page {page} of {totalPages}</span>
          <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="p-2 border rounded disabled:opacity-50"><ChevronRight/></button>
        </div>
      )}
    </div>
  );
};

// --- Dashboard Logic ---

const Dashboard = ({ navigate, user, userData, showToast }) => {
  const [view, setView] = useState('profile');
  const role = userData?.role || 'user';

  const menuItems = {
    user: [
      { id: 'profile', label: 'My Profile', icon: User },
      { id: 'announcements', label: 'Announcements', icon: Bell },
    ],
    member: [
      { id: 'profile', label: 'My Profile', icon: User },
      { id: 'payment', label: 'Make Payment', icon: CreditCard },
      { id: 'history', label: 'Payment History', icon: FileText },
      { id: 'announcements', label: 'Announcements', icon: Bell },
    ],
    admin: [
      { id: 'adminProfile', label: 'Admin Profile', icon: LayoutDashboard },
      { id: 'manageMembers', label: 'Manage Members', icon: Users },
      { id: 'makeAnnouncement', label: 'Make Announcement', icon: Bell },
      { id: 'agreements', label: 'Agreements', icon: FileText },
      { id: 'coupons', label: 'Manage Coupons', icon: Tag },
    ]
  };

  const currentMenu = menuItems[role] || menuItems['user'];

  const renderContent = () => {
    switch(view) {
      // Shared /
      case 'profile': return <Profile user={user} userData={userData} />;
      case 'announcements': return <Announcements />;
      
      // Member
      case 'payment': return <MakePayment user={user} userData={userData} showToast={showToast} navigate={navigate}/>;
      case 'history': return <PaymentHistory user={user} />;
      
      // Admin
      case 'adminProfile': return <AdminStats />;
      case 'manageMembers': return <ManageMembers showToast={showToast} />;
      case 'makeAnnouncement': return <MakeAnnouncement showToast={showToast} />;
      case 'agreements': return <AgreementRequests showToast={showToast} />;
      case 'coupons': return <ManageCoupons showToast={showToast} />;
      default: return <Profile user={user} userData={userData} />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-6">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white rounded-lg shadow p-4 h-fit">
        <div className="mb-6 text-center border-b pb-4">
          <img src={user.photoURL} alt="Profile" className="w-16 h-16 rounded-full mx-auto mb-2"/>
          <h3 className="font-bold text-gray-800">{user.displayName}</h3>
          <span className="text-xs uppercase bg-gray-200 px-2 py-1 rounded text-gray-700">{role}</span>
        </div>
        <nav className="space-y-2">
          {currentMenu.map(item => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center px-4 py-3 rounded text-sm font-medium transition ${view === item.id ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <item.icon size={18} className="mr-3" />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content Area */}
      <main className="flex-1 bg-white rounded-lg shadow p-6 min-h-[500px]">
        {renderContent()}
      </main>
    </div>
  );
};

// --- Dashboard Sub-Components ---

const Profile = ({ user, userData }) => (
  <div>
    <h2 className="text-2xl font-bold mb-6">My Profile</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded">
          <label className="text-xs text-gray-500 uppercase">Full Name</label>
          <p className="font-medium text-lg">{user.displayName}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded">
          <label className="text-xs text-gray-500 uppercase">Email</label>
          <p className="font-medium text-lg">{user.email}</p>
        </div>
      </div>
      
      <div className="bg-blue-50 p-6 rounded-lg">
        <h3 className="font-bold text-lg mb-4 text-blue-800">Apartment Info</h3>
        {userData?.rentedApartment ? (
            <div className="space-y-2">
                <div className="flex justify-between border-b border-blue-200 pb-2">
                    <span>Block:</span>
                    <span className="font-bold">{userData.rentedApartment.block}</span>
                </div>
                <div className="flex justify-between border-b border-blue-200 pb-2">
                    <span>Floor:</span>
                    <span className="font-bold">{userData.rentedApartment.floor}</span>
                </div>
                <div className="flex justify-between border-b border-blue-200 pb-2">
                    <span>Apartment No:</span>
                    <span className="font-bold">{userData.rentedApartment.apartmentNo}</span>
                </div>
                <div className="flex justify-between pt-2">
                    <span>Agreement Date:</span>
                    <span className="font-bold">{userData.agreementDate?.split('T')[0]}</span>
                </div>
            </div>
        ) : (
            <div className="text-center py-8 text-gray-500">
                <p>No apartment rented yet.</p>
                <p className="text-sm mt-2">Apply for an agreement in the Apartments page.</p>
            </div>
        )}
      </div>
    </div>
  </div>
);

const Announcements = () => {
  const [list, setList] = useState([]);

  useEffect(() => {
    
    const q = query(collection(db, getCollectionPath('announcements')));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({id: d.id, ...d.data()}));
      // Sort client side
      data.sort((a,b) => new Date(b.date) - new Date(a.date));
      setList(data);
    });
    return () => unsub();
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Building Announcements</h2>
      <div className="space-y-4">
        {list.length === 0 && <p className="text-gray-500">No announcements yet.</p>}
        {list.map(item => (
          <div key={item.id} className="border-l-4 border-yellow-400 bg-yellow-50 p-4 rounded">
            <h3 className="font-bold text-lg text-gray-800">{item.title}</h3>
            <p className="text-gray-700 mt-1">{item.description}</p>
            <span className="text-xs text-gray-400 mt-2 block">{new Date(item.date).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const MakePayment = ({ user, userData, showToast }) => {
  const [month, setMonth] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [processing, setProcessing] = useState(false);

  const rent = userData?.rentedApartment?.rent || 0;
  const finalAmount = rent - (rent * (discount / 100));

  const applyCoupon = async () => {
    if(!couponCode) return;
    const q = query(collection(db, getCollectionPath('coupons')));
    
    try {
        const snap = await getDocs(q);
        const coupons = snap.docs.map(d => d.data());
        const validCoupon = coupons.find(c => c.code === couponCode && c.isAvailable === true);
        
        if (validCoupon) {
            setDiscount(validCoupon.discount);
            showToast("Coupon Applied!", "success");
        } else {
            setDiscount(0);
            showToast("Invalid Coupon", "error");
        }
    } catch {
        showToast("Error checking coupon", "error");
    }
  };

  const handlePay = async (e) => {
    e.preventDefault();
    setProcessing(true);
    // Simulate API call
    setTimeout(async () => {
      try {
        await addDoc(collection(db, getCollectionPath('payments')), {
          memberEmail: user.email,
          month,
          rent,
          discount,
          finalAmount,
          date: new Date().toISOString(),
          transactionId: `TXN-${Date.now()}`
        });
        showToast("Payment Successful!");
        setMonth('');
        setCouponCode('');
        setDiscount(0);
      } catch {
        showToast("Payment Failed", "error");
      }
      setProcessing(false);
    }, 1500);
  };

  if (!userData?.rentedApartment) return <div>No rented apartment found.</div>;

  return (
    <div>
       <h2 className="text-2xl font-bold mb-6">Make Payment</h2>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <form onSubmit={handlePay} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 uppercase">Apartment</label>
                <input disabled value={userData.rentedApartment.apartmentNo} className="w-full bg-gray-100 p-2 rounded border" />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase">Rent</label>
                <input disabled value={`$${rent}`} className="w-full bg-gray-100 p-2 rounded border" />
              </div>
            </div>
            <div>
              <label className="text-sm font-bold">Select Month</label>
              <select required className="w-full p-2 border rounded mt-1" value={month} onChange={e=>setMonth(e.target.value)}>
                <option value="">Select...</option>
                {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-sm font-bold">Coupon Code</label>
                <input 
                  type="text" 
                  className="w-full p-2 border rounded mt-1" 
                  value={couponCode} onChange={e=>setCouponCode(e.target.value)}
                />
              </div>
              <button type="button" onClick={applyCoupon} className="bg-gray-800 text-white px-4 py-2 rounded h-10 mb-0.5">Apply</button>
            </div>
            
            <div className="bg-green-50 p-4 rounded border border-green-200">
              <div className="flex justify-between mb-2"><span>Original Rent:</span> <span>${rent}</span></div>
              <div className="flex justify-between mb-2 text-green-700"><span>Discount:</span> <span>-{discount}%</span></div>
              <div className="flex justify-between font-bold text-xl pt-2 border-t border-green-200"><span>Total:</span> <span>${finalAmount.toFixed(2)}</span></div>
            </div>

            <button disabled={processing} type="submit" className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 transition disabled:opacity-50">
              {processing ? 'Processing...' : 'Pay Now'}
            </button>
         </form>
         
         <div className="bg-gray-50 rounded p-6 flex flex-col items-center justify-center text-center">
            <ShieldCheck size={48} className="text-blue-600 mb-4"/>
            <h3 className="font-bold text-lg">Secure Payment</h3>
            <p className="text-sm text-gray-500 mt-2">Your transactions are secured with end-to-end encryption. We support all major credit cards and online banking.</p>
         </div>
       </div>
    </div>
  );
};

const PaymentHistory = ({ user }) => {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    
    const fetchHistory = async () => {
        try {
            const q = query(collection(db, getCollectionPath('payments')));
            const snap = await getDocs(q);
            const userHistory = snap.docs
                .map(d => d.data())
                .filter(d => d.memberEmail === user.email);
            setHistory(userHistory);
        } catch(e) {
            console.error(e);
        }
    };
    fetchHistory();
  }, [user.email]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Payment History</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 font-semibold">Month</th>
              <th className="p-3 font-semibold">Amount</th>
              <th className="p-3 font-semibold">Txn ID</th>
              <th className="p-3 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {history.map((h, i) => (
              <tr key={i}>
                <td className="p-3">{h.month}</td>
                <td className="p-3">${h.finalAmount}</td>
                <td className="p-3 font-mono text-xs">{h.transactionId}</td>
                <td className="p-3">{new Date(h.date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {history.length === 0 && <p className="text-center p-4 text-gray-500">No payment records found.</p>}
      </div>
    </div>
  );
};

// --- Admin Sub-Components ---

const AdminStats = () => {
    const [stats, setStats] = useState({ rooms: 0, users: 0, members: 0, availablePercent: 0, unavailPercent: 0 });

    useEffect(() => {
        const fetchStats = async () => {
            const aptSnap = await getDocs(collection(db, getCollectionPath('apartments')));
            const usersSnap = await getDocs(collection(db, getCollectionPath('users')));
            
            const totalRooms = aptSnap.size;
            const users = usersSnap.docs.map(d => d.data());
            const totalUsers = users.length;
            const members = users.filter(u => u.role === 'member').length;
            const rentedCount = users.filter(u => u.rentedApartment).length; 

            const unavailPercent = totalRooms > 0 ? ((rentedCount / totalRooms) * 100).toFixed(1) : 0;
            const availablePercent = (100 - unavailPercent).toFixed(1);

            setStats({ 
                rooms: totalRooms, 
                users: totalUsers, 
                members, 
                availablePercent, 
                unavailPercent 
            });
        };
        fetchStats();
    }, []);

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-100 p-4 rounded-lg">
                    <h3 className="text-xs uppercase font-bold text-blue-800">Total Rooms</h3>
                    <p className="text-2xl font-bold text-blue-900">{stats.rooms}</p>
                </div>
                <div className="bg-green-100 p-4 rounded-lg">
                    <h3 className="text-xs uppercase font-bold text-green-800">Available %</h3>
                    <p className="text-2xl font-bold text-green-900">{stats.availablePercent}%</p>
                </div>
                <div className="bg-orange-100 p-4 rounded-lg">
                    <h3 className="text-xs uppercase font-bold text-orange-800">Booked %</h3>
                    <p className="text-2xl font-bold text-orange-900">{stats.unavailPercent}%</p>
                </div>
                <div className="bg-purple-100 p-4 rounded-lg">
                    <h3 className="text-xs uppercase font-bold text-purple-800">Members</h3>
                    <p className="text-2xl font-bold text-purple-900">{stats.members}</p>
                </div>
            </div>
            {/* Simple Pie Chart Representation */}
            <div className="mt-8">
                <h3 className="font-bold mb-4">Occupancy Visualization</h3>
                <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden flex">
                    <div style={{width: `${stats.unavailPercent}%`}} className="bg-orange-500 h-full"></div>
                    <div style={{width: `${stats.availablePercent}%`}} className="bg-green-500 h-full"></div>
                </div>
                <div className="flex gap-4 mt-2 text-sm">
                    <div className="flex items-center"><div className="w-3 h-3 bg-orange-500 rounded-full mr-1"></div> Booked</div>
                    <div className="flex items-center"><div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div> Available</div>
                </div>
            </div>
        </div>
    );
}

const ManageMembers = ({ showToast }) => {
    const [members, setMembers] = useState([]);

    useEffect(() => {
        // Manual filter to avoid index requirement on custom DB
        const q = query(collection(db, getCollectionPath('users')));
        const unsub = onSnapshot(q, (snap) => {
            const allUsers = snap.docs.map(d => ({id: d.id, ...d.data()}));
            setMembers(allUsers.filter(u => u.role === 'member'));
        });
        return () => unsub();
    }, []);

    const handleRemove = async (memberId) => {
        try {
            const ref = doc(db, getCollectionPath('users'), memberId);
            await updateDoc(ref, {
                role: 'user',
                rentedApartment: null,
                agreementDate: null
            });
            showToast("Member removed successfully.");
        } catch {
            showToast("Error removing member", "error");
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Manage Members</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm bg-white border rounded">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3">Name</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {members.map(m => (
                            <tr key={m.id}>
                                <td className="p-3">{m.name}</td>
                                <td className="p-3">{m.email}</td>
                                <td className="p-3">
                                    <button onClick={() => handleRemove(m.id)} className="text-red-600 hover:text-red-800 font-bold text-xs border border-red-200 bg-red-50 px-3 py-1 rounded">Remove</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {members.length === 0 && <p className="p-4 text-center text-gray-500">No members found.</p>}
            </div>
        </div>
    );
};

const MakeAnnouncement = ({ showToast }) => {
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, getCollectionPath('announcements')), {
                title,
                description: desc,
                date: new Date().toISOString()
            });
            showToast("Announcement Posted!");
            setTitle('');
            setDesc('');
        } catch {
            showToast("Error posting", "error");
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Make Announcement</h2>
            <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
                <div>
                    <label className="block text-sm font-medium">Title</label>
                    <input required className="w-full border rounded p-2" value={title} onChange={e=>setTitle(e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm font-medium">Description</label>
                    <textarea required className="w-full border rounded p-2 h-32" value={desc} onChange={e=>setDesc(e.target.value)} />
                </div>
                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">Post</button>
            </form>
        </div>
    );
};

const AgreementRequests = ({ showToast }) => {
    const [requests, setRequests] = useState([]);

    useEffect(() => {
        // Manual filter to avoid index requirement
        const q = query(collection(db, getCollectionPath('agreements')));
        const unsub = onSnapshot(q, (snap) => {
            const all = snap.docs.map(d => ({id: d.id, ...d.data()}));
            setRequests(all.filter(r => r.status === 'pending'));
        });
        return () => unsub();
    }, []);

    const handleAction = async (req, action) => {
        try {
            // Update Agreement Status
            await updateDoc(doc(db, getCollectionPath('agreements'), req.id), {
                status: 'checked'
            });

            if (action === 'accept') {
                let userDocRef;
                const q = query(collection(db, getCollectionPath('users')));
                const snap = await getDocs(q);
                const userDoc = snap.docs.find(d => d.data().uid === req.userId);
                
                if (userDoc) {
                    userDocRef = userDoc.ref;
                    await updateDoc(userDocRef, {
                        role: 'member',
                        agreementDate: new Date().toISOString(),
                        rentedApartment: {
                            floor: req.floor,
                            block: req.block,
                            apartmentNo: req.apartmentNo,
                            rent: req.rent
                        }
                    });
                    showToast("Request Accepted. User promoted to Member.");
                } else {
                    showToast("User not found in database", "error");
                }
            } else {
                showToast("Request Rejected.");
            }
        } catch (e) {
            console.error(e);
            showToast("Error processing request", "error");
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Agreement Requests</h2>
            <div className="space-y-4">
                {requests.map(req => (
                    <div key={req.id} className="bg-white border rounded p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h4 className="font-bold">{req.userName} <span className="text-sm font-normal text-gray-500">({req.userEmail})</span></h4>
                            <p className="text-sm text-gray-700">Apt {req.apartmentNo}, Floor {req.floor}, Block {req.block}</p>
                            <p className="text-xs text-gray-400">{new Date(req.requestDate).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={()=>handleAction(req, 'accept')} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 flex items-center"><Check size={16} className="mr-1"/> Accept</button>
                            <button onClick={()=>handleAction(req, 'reject')} className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 flex items-center"><X size={16} className="mr-1"/> Reject</button>
                        </div>
                    </div>
                ))}
                {requests.length === 0 && <p className="text-gray-500">No pending requests.</p>}
            </div>
        </div>
    );
};

const ManageCoupons = ({ showToast }) => {
    const [coupons, setCoupons] = useState([]);
    const [newCoupon, setNewCoupon] = useState({ code: '', discount: 0, description: '' });
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, getCollectionPath('coupons')), (snap) => {
            setCoupons(snap.docs.map(d => ({id: d.id, ...d.data()})));
        });
        return () => unsub();
    }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, getCollectionPath('coupons')), {
                ...newCoupon,
                discount: Number(newCoupon.discount),
                isAvailable: true
            });
            setIsOpen(false);
            setNewCoupon({ code: '', discount: 0, description: '' });
            showToast("Coupon Added");
        } catch {
            showToast("Error adding coupon", "error");
        }
    };

    const toggleAvailability = async (id, currentStatus) => {
        try {
            await updateDoc(doc(db, getCollectionPath('coupons'), id), {
                isAvailable: !currentStatus
            });
        } catch {
            showToast("Error updating status", "error");
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Manage Coupons</h2>
                <button onClick={()=>setIsOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add Coupon</button>
            </div>

            {isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-96">
                        <h3 className="text-xl font-bold mb-4">Add New Coupon</h3>
                        <form onSubmit={handleAdd} className="space-y-3">
                            <input required placeholder="Code (e.g. SALE50)" className="w-full border p-2 rounded" value={newCoupon.code} onChange={e=>setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})} />
                            <input required type="number" placeholder="Discount %" className="w-full border p-2 rounded" value={newCoupon.discount} onChange={e=>setNewCoupon({...newCoupon, discount: e.target.value})} />
                            <textarea required placeholder="Description" className="w-full border p-2 rounded" value={newCoupon.description} onChange={e=>setNewCoupon({...newCoupon, description: e.target.value})} />
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={()=>setIsOpen(false)} className="text-gray-600 hover:bg-gray-100 px-3 py-1 rounded">Cancel</button>
                                <button type="submit" className="bg-blue-600 text-white px-4 py-1 rounded">Submit</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3">Code</th>
                            <th className="p-3">Discount</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {coupons.map(c => (
                            <tr key={c.id}>
                                <td className="p-3 font-mono font-bold">{c.code}</td>
                                <td className="p-3">{c.discount}%</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${c.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {c.isAvailable ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="p-3">
                                    <button onClick={()=>toggleAvailability(c.id, c.isAvailable)} className="text-blue-600 hover:underline">Toggle Status</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};