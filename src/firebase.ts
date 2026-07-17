/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  setDoc,
  getDoc
} from 'firebase/firestore';

// Define schemas
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  photoUrl: string;
  locationName: string;
  lat: number;
  lng: number;
  bio: string;
  createdAt: string;
  reportedBy?: string[];
}

export interface Listing {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  type: 'offer' | 'request'; // "I can teach X" | "I need Y"
  title: string;
  category: string;
  description: string;
  availability: string;
  locationName: string;
  lat: number;
  lng: number;
  radiusKm: number;
  status: 'active' | 'closed';
  createdAt: string;
  reportedBy?: string[];
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  listingId?: string;
  listingTitle?: string;
  content: string;
  timestamp: string;
}

export interface Review {
  id: string;
  reviewerId: string;
  reviewerName: string;
  revieweeId: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

// Check if firebase configuration is available
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

const isFirebaseConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

let useMock = !isFirebaseConfigured;
let auth: any = null;
let db: any = null;

if (isFirebaseConfigured) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase initialized successfully.");
  } catch (err) {
    console.warn("Firebase initialization failed, falling back to client-side localStorage db:", err);
    useMock = true;
  }
}

// -------------------------------------------------------------
// LOCAL STATE STORAGE ENGINE (FALLBACK)
// -------------------------------------------------------------

// Default pre-seeded data for a premium initial experience
const DEFAULT_USERS: UserProfile[] = [
  {
    id: "user_ayesha",
    name: "Ayesha Khan",
    email: "ayesha@example.com",
    photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    locationName: "Gulberg, Lahore",
    lat: 31.5204,
    lng: 74.3587,
    bio: "Passionate about web design and Urdu literature. Willing to teach beginner Figma/UI design systems or classical Urdu poetry. Eager to learn Python programming or mobile app development!",
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "user_zain",
    name: "Zain Ahmed",
    email: "zain@example.com",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    locationName: "Clifton, Karachi",
    lat: 24.8138,
    lng: 67.0315,
    bio: "Full Stack Developer with expertise in React, Node.js, and Cloud architectures. Offering web coding lessons in exchange for advanced culinary skills or spoken Arabic practice.",
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "user_faisal",
    name: "Faisal Shah",
    email: "faisal@example.com",
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    locationName: "F-7, Islamabad",
    lat: 33.7297,
    lng: 73.0548,
    bio: "Classical Sitar player and music tutor. Offering Sitar or general music theory/chords training. I am eager to learn UI/UX design or graphic design basics.",
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "user_maryam",
    name: "Maryam Bibi",
    email: "maryam@example.com",
    photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
    locationName: "Saddar, Peshawar",
    lat: 34.0084,
    lng: 71.5484,
    bio: "Professional chef specialized in traditional Peshawari cuisine and Mughlai dishes. I can teach traditional spices, mutton karahi, and chapli kebab making. Looking to learn basic HTML/JS programming.",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const DEFAULT_LISTINGS: Listing[] = [
  {
    id: "list_1",
    userId: "user_ayesha",
    userName: "Ayesha Khan",
    userPhoto: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    type: "offer",
    title: "Urdu Literature & Poetry Tutoring",
    category: "Languages",
    description: "I offer structured lessons in classical Urdu poetry, Urdu grammar, and conversational practice. Whether you want to appreciate Faiz and Ghalib or improve your reading/writing, I am here to help!",
    availability: "Tuesdays & Thursdays evenings, Saturday mornings",
    locationName: "Gulberg, Lahore",
    lat: 31.5204,
    lng: 74.3587,
    radiusKm: 15,
    status: "active",
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "list_2",
    userId: "user_ayesha",
    userName: "Ayesha Khan",
    userPhoto: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    type: "request",
    title: "Beginner Python Programming",
    category: "Technology & Coding",
    description: "I want to learn Python for data analysis. Looking for someone patient to teach me basic variables, loops, and data frames. Happy to trade for Urdu lessons or Figma tips!",
    availability: "Weekend afternoons preferred",
    locationName: "Gulberg, Lahore",
    lat: 31.5204,
    lng: 74.3587,
    radiusKm: 10,
    status: "active",
    createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "list_3",
    userId: "user_zain",
    userName: "Zain Ahmed",
    userPhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    type: "offer",
    title: "Web Development (React, TypeScript, CSS)",
    category: "Technology & Coding",
    description: "Senior Frontend Engineer available to help you build your React projects, understand TypeScript types, or debug modern Javascript layouts. Let's write some beautiful code together!",
    availability: "Flexible, mostly weekday evenings or Sundays",
    locationName: "Clifton, Karachi",
    lat: 24.8138,
    lng: 67.0315,
    radiusKm: 25,
    status: "active",
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "list_4",
    userId: "user_zain",
    userName: "Zain Ahmed",
    userPhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    type: "request",
    title: "Mughlai Cooking & Meal Prep Practice",
    category: "Cooking & Culinary",
    description: "Want to learn authentic local cooking from someone who knows spice blends. Ready to trade web development coaching for hands-on cooking lessons or kitchen techniques!",
    availability: "Weeknights after 7 PM",
    locationName: "Clifton, Karachi",
    lat: 24.8138,
    lng: 67.0315,
    radiusKm: 15,
    status: "active",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "list_5",
    userId: "user_faisal",
    userName: "Faisal Shah",
    userPhoto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    type: "offer",
    title: "Classical Sitar & Music Theory",
    category: "Music & Instruments",
    description: "Sitar player with years of experience. I teach traditional raags, tuning, correct sitting posture, and simple folk melodies. Beginners are absolutely welcome!",
    availability: "Mondays and Wednesdays from 2 PM - 8 PM",
    locationName: "F-7, Islamabad",
    lat: 33.7297,
    lng: 73.0548,
    radiusKm: 20,
    status: "active",
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "list_6",
    userId: "user_maryam",
    userName: "Maryam Bibi",
    userPhoto: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
    type: "request",
    title: "UI Design & Figma Foundations",
    category: "Arts & Crafts",
    description: "I want to design a beautiful music app for my students. I need someone to teach me how to use Figma, understand typography, spacing, colors, and layout principles.",
    availability: "Flexible, can adapt to your schedule",
    locationName: "Saddar, Peshawar",
    lat: 34.0084,
    lng: 71.5484,
    radiusKm: 10,
    status: "active",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "list_7",
    userId: "user_maryam",
    userName: "Maryam Bibi",
    userPhoto: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
    type: "offer",
    title: "Mughlai Chapli Kebab Masterclass",
    category: "Cooking & Culinary",
    description: "Learn how to prep traditional Peshawari chapli kebabs and specialized mutton/chicken handi from scratch, use proper dry spice proportions, and cook them perfectly. Safer, quicker, and absolutely delicious!",
    availability: "Fridays or Saturday afternoons",
    locationName: "Saddar, Peshawar",
    lat: 34.0084,
    lng: 71.5484,
    radiusKm: 12,
    status: "active",
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const DEFAULT_MESSAGES: Message[] = [
  {
    id: "msg_1",
    senderId: "user_ayesha",
    senderName: "Ayesha Khan",
    receiverId: "user_faisal",
    receiverName: "Faisal Shah",
    listingId: "list_5",
    listingTitle: "Classical Sitar & Music Theory",
    content: "Hi Faisal! I saw your post offering Sitar lessons. I would love to learn the basic raags! I can teach you classical Urdu poetry in return if you are interested.",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "msg_2",
    senderId: "user_faisal",
    senderName: "Faisal Shah",
    receiverId: "user_ayesha",
    receiverName: "Ayesha Khan",
    listingId: "list_5",
    listingTitle: "Classical Sitar & Music Theory",
    content: "Hi Ayesha! Yes, I would absolutely love to exchange! Your Urdu literature background is exactly what I need because I am trying to write new poetry lyrics for classical music compositions. Let's arrange a trade!",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString()
  }
];

const DEFAULT_REVIEWS: Review[] = [
  {
    id: "rev_1",
    reviewerId: "user_zain",
    reviewerName: "Zain Ahmed",
    revieweeId: "user_maryam",
    rating: 5,
    comment: "Maryam is amazing! She taught me traditional spice blending and authentic Peshawari Karahi techniques. She has extreme patience and her culinary knowledge is vast. In exchange, I helped her set up her personal website layout and CSS. 10/10 exchange!",
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Helper to initialize localStorage values if they don't exist
const initializeLocalStorage = () => {
  if (!localStorage.getItem('sk_users')) {
    localStorage.setItem('sk_users', JSON.stringify(DEFAULT_USERS));
  }
  if (!localStorage.getItem('sk_listings')) {
    localStorage.setItem('sk_listings', JSON.stringify(DEFAULT_LISTINGS));
  }
  if (!localStorage.getItem('sk_messages')) {
    localStorage.setItem('sk_messages', JSON.stringify(DEFAULT_MESSAGES));
  }
  if (!localStorage.getItem('sk_reviews')) {
    localStorage.setItem('sk_reviews', JSON.stringify(DEFAULT_REVIEWS));
  }
  if (!localStorage.getItem('sk_reported')) {
    localStorage.setItem('sk_reported', JSON.stringify([]));
  }
};

if (useMock) {
  initializeLocalStorage();
}

// -------------------------------------------------------------
// GEOGRAPHIC DISTANCE HELPER
// -------------------------------------------------------------
// Haversine formula to compute distance in km
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

// -------------------------------------------------------------
// SERVICE EXPORTS (Supports either Firebase or Mock seamlessly)
// -------------------------------------------------------------

// Active state of current logged in user (starts with a default if mock)
let currentUserProfile: UserProfile | null = useMock ? DEFAULT_USERS[1] : null; // Default to Zain Ahmed to display fully active dashboards
let authListeners: ((user: UserProfile | null) => void)[] = [];

export const getFirebaseMode = () => {
  return !useMock;
};

export const onProfileStateChange = (callback: (user: UserProfile | null) => void) => {
  authListeners.push(callback);
  // Trigger immediately
  callback(currentUserProfile);

  if (!useMock && auth) {
    return onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        // Fetch profile from Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", fbUser.uid));
          if (userDoc.exists()) {
            currentUserProfile = userDoc.data() as UserProfile;
          } else {
            // Setup default profile
            const newProfile: UserProfile = {
              id: fbUser.uid,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || "New User",
              email: fbUser.email || "",
              photoUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${fbUser.uid}`,
              locationName: "Gulberg, Lahore",
              lat: 31.5204,
              lng: 74.3587,
              bio: "I'm a new member of the local skill-exchange network!",
              createdAt: new Date().toISOString()
            };
            await setDoc(doc(db, "users", fbUser.uid), newProfile);
            currentUserProfile = newProfile;
          }
        } catch (err) {
          console.error("Error loading user doc:", err);
          currentUserProfile = {
            id: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split('@')[0] || "User",
            email: fbUser.email || "",
            photoUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${fbUser.uid}`,
            locationName: "Lahore, Pakistan",
            lat: 31.5204,
            lng: 74.3587,
            bio: "Active learner & teacher.",
            createdAt: new Date().toISOString()
          };
        }
      } else {
        currentUserProfile = null;
      }
      callback(currentUserProfile);
    });
  }

  return () => {
    authListeners = authListeners.filter(c => c !== callback);
  };
};

export const getCurrentUserProfile = (): UserProfile | null => {
  return currentUserProfile;
};

// SIGN UP
export async function signUpUser(name: string, email: string, pass: string, locationName: string, lat: number, lng: number, bio: string): Promise<UserProfile> {
  if (useMock) {
    const users: UserProfile[] = JSON.parse(localStorage.getItem('sk_users') || '[]');
    if (users.some(u => u.email === email)) {
      throw new Error("A user with this email already exists.");
    }
    const newUser: UserProfile = {
      id: `user_${Date.now()}`,
      name,
      email,
      photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      locationName,
      lat,
      lng,
      bio,
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    localStorage.setItem('sk_users', JSON.stringify(users));
    currentUserProfile = newUser;
    authListeners.forEach(c => c(currentUserProfile));
    return newUser;
  } else {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const newProfile: UserProfile = {
      id: cred.user.uid,
      name,
      email,
      photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      locationName,
      lat,
      lng,
      bio,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, "users", cred.user.uid), newProfile);
    currentUserProfile = newProfile;
    authListeners.forEach(c => c(currentUserProfile));
    return newProfile;
  }
}

// LOG IN
export async function signInUser(email: string, pass: string): Promise<UserProfile> {
  if (useMock) {
    const users: UserProfile[] = JSON.parse(localStorage.getItem('sk_users') || '[]');
    const user = users.find(u => u.email === email);
    if (!user) {
      throw new Error("No account found with this email. Please sign up!");
    }
    currentUserProfile = user;
    authListeners.forEach(c => c(currentUserProfile));
    return user;
  } else {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const userDoc = await getDoc(doc(db, "users", cred.user.uid));
    if (userDoc.exists()) {
      currentUserProfile = userDoc.data() as UserProfile;
    } else {
      throw new Error("User profile not found in database.");
    }
    authListeners.forEach(c => c(currentUserProfile));
    return currentUserProfile;
  }
}

// LOG OUT
export async function logoutUser() {
  if (useMock) {
    currentUserProfile = null;
    authListeners.forEach(c => c(null));
  } else {
    await signOut(auth);
    currentUserProfile = null;
    authListeners.forEach(c => c(null));
  }
}

// UPDATE BIO / PROFILE
export async function updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
  if (!currentUserProfile) throw new Error("Must be logged in.");

  const updatedProfile = { ...currentUserProfile, ...updates };

  if (useMock) {
    const users: UserProfile[] = JSON.parse(localStorage.getItem('sk_users') || '[]');
    const index = users.findIndex(u => u.id === currentUserProfile!.id);
    if (index !== -1) {
      users[index] = updatedProfile;
      localStorage.setItem('sk_users', JSON.stringify(users));
    }
    currentUserProfile = updatedProfile;
    authListeners.forEach(c => c(currentUserProfile));
    return updatedProfile;
  } else {
    await updateDoc(doc(db, "users", currentUserProfile.id), updates);
    currentUserProfile = updatedProfile;
    authListeners.forEach(c => c(currentUserProfile));
    return updatedProfile;
  }
}

// -------------------------------------------------------------
// LISTINGS CRUD
// -------------------------------------------------------------

export async function createListing(listingData: Omit<Listing, 'id' | 'userId' | 'userName' | 'userPhoto' | 'status' | 'createdAt'>): Promise<Listing> {
  if (!currentUserProfile) throw new Error("Must be logged in.");

  const newListing: Listing = {
    ...listingData,
    id: `list_${Date.now()}`,
    userId: currentUserProfile.id,
    userName: currentUserProfile.name,
    userPhoto: currentUserProfile.photoUrl,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  if (useMock) {
    const listings: Listing[] = JSON.parse(localStorage.getItem('sk_listings') || '[]');
    listings.unshift(newListing);
    localStorage.setItem('sk_listings', JSON.stringify(listings));
    return newListing;
  } else {
    const docRef = await addDoc(collection(db, "listings"), newListing);
    const savedListing = { ...newListing, id: docRef.id };
    await updateDoc(doc(db, "listings", docRef.id), { id: docRef.id });
    return savedListing;
  }
}

export async function getListings(): Promise<Listing[]> {
  if (useMock) {
    const listings: Listing[] = JSON.parse(localStorage.getItem('sk_listings') || '[]');
    const reported: string[] = JSON.parse(localStorage.getItem('sk_reported') || '[]');
    
    // Filter out reported listings
    return listings.filter(l => !reported.includes(`list_${l.id}`) && !reported.includes(`user_${l.userId}`) && l.status === 'active');
  } else {
    const q = query(collection(db, "listings"), where("status", "==", "active"));
    const snap = await getDocs(q);
    const listings: Listing[] = [];
    snap.forEach((doc) => {
      listings.push(doc.data() as Listing);
    });
    return listings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export async function updateListing(listingId: string, updates: Partial<Listing>): Promise<void> {
  if (useMock) {
    const listings: Listing[] = JSON.parse(localStorage.getItem('sk_listings') || '[]');
    const index = listings.findIndex(l => l.id === listingId);
    if (index !== -1) {
      listings[index] = { ...listings[index], ...updates };
      localStorage.setItem('sk_listings', JSON.stringify(listings));
    }
  } else {
    await updateDoc(doc(db, "listings", listingId), updates);
  }
}

export async function deleteListing(listingId: string): Promise<void> {
  if (useMock) {
    const listings: Listing[] = JSON.parse(localStorage.getItem('sk_listings') || '[]');
    const filtered = listings.filter(l => l.id !== listingId);
    localStorage.setItem('sk_listings', JSON.stringify(filtered));
  } else {
    await deleteDoc(doc(db, "listings", listingId));
  }
}

// -------------------------------------------------------------
// CHAT MESSAGING
// -------------------------------------------------------------

export async function sendMessage(receiverId: string, receiverName: string, content: string, listingId?: string, listingTitle?: string): Promise<Message> {
  if (!currentUserProfile) throw new Error("Must be logged in.");

  const newMsg: Message = {
    id: `msg_${Date.now()}`,
    senderId: currentUserProfile.id,
    senderName: currentUserProfile.name,
    receiverId,
    receiverName,
    listingId,
    listingTitle,
    content,
    timestamp: new Date().toISOString()
  };

  if (useMock) {
    const messages: Message[] = JSON.parse(localStorage.getItem('sk_messages') || '[]');
    messages.push(newMsg);
    localStorage.setItem('sk_messages', JSON.stringify(messages));
    return newMsg;
  } else {
    const docRef = await addDoc(collection(db, "messages"), newMsg);
    const savedMsg = { ...newMsg, id: docRef.id };
    await updateDoc(doc(db, "messages", docRef.id), { id: docRef.id });
    return savedMsg;
  }
}

export async function getMessages(otherUserId: string): Promise<Message[]> {
  if (!currentUserProfile) return [];

  if (useMock) {
    const messages: Message[] = JSON.parse(localStorage.getItem('sk_messages') || '[]');
    const myId = currentUserProfile.id;
    return messages.filter(m => 
      (m.senderId === myId && m.receiverId === otherUserId) ||
      (m.senderId === otherUserId && m.receiverId === myId)
    ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  } else {
    // Real-time queries for current user's chats
    const q1 = query(
      collection(db, "messages"), 
      where("senderId", "==", currentUserProfile.id),
      where("receiverId", "==", otherUserId)
    );
    const q2 = query(
      collection(db, "messages"), 
      where("senderId", "==", otherUserId),
      where("receiverId", "==", currentUserProfile.id)
    );

    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    const list: Message[] = [];
    snap1.forEach(d => list.push(d.data() as Message));
    snap2.forEach(d => list.push(d.data() as Message));
    
    return list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
}

export function subscribeToMessages(otherUserId: string, callback: (msgs: Message[]) => void) {
  if (!currentUserProfile) return () => {};

  if (useMock) {
    const interval = setInterval(() => {
      const messages: Message[] = JSON.parse(localStorage.getItem('sk_messages') || '[]');
      const myId = currentUserProfile!.id;
      const filtered = messages.filter(m => 
        (m.senderId === myId && m.receiverId === otherUserId) ||
        (m.senderId === otherUserId && m.receiverId === myId)
      ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      callback(filtered);
    }, 1000);
    return () => clearInterval(interval);
  } else {
    // Firestore real-time listener
    const q = query(
      collection(db, "messages"),
      orderBy("timestamp", "asc")
    );
    return onSnapshot(q, (snapshot) => {
      const myId = currentUserProfile!.id;
      const list: Message[] = [];
      snapshot.forEach(doc => {
        const msg = doc.data() as Message;
        if ((msg.senderId === myId && msg.receiverId === otherUserId) || 
            (msg.senderId === otherUserId && msg.receiverId === myId)) {
          list.push(msg);
        }
      });
      callback(list);
    });
  }
}

export async function getActiveChats(): Promise<{ userId: string; name: string; lastMessage: string; timestamp: string }[]> {
  if (!currentUserProfile) return [];

  const myId = currentUserProfile.id;

  if (useMock) {
    const messages: Message[] = JSON.parse(localStorage.getItem('sk_messages') || '[]');
    const myMessages = messages.filter(m => m.senderId === myId || m.receiverId === myId);
    
    const chatPartners: Record<string, { name: string; lastMessage: string; timestamp: string }> = {};
    
    myMessages.forEach(m => {
      const isSender = m.senderId === myId;
      const partnerId = isSender ? m.receiverId : m.senderId;
      const partnerName = isSender ? m.receiverName : m.senderName;
      
      const current = chatPartners[partnerId];
      if (!current || new Date(m.timestamp).getTime() > new Date(current.timestamp).getTime()) {
        chatPartners[partnerId] = {
          name: partnerName,
          lastMessage: m.content,
          timestamp: m.timestamp
        };
      }
    });

    return Object.entries(chatPartners).map(([userId, data]) => ({
      userId,
      ...data
    })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } else {
    // Standard query for full-stack, but here we scan messages where user participates
    const q1 = query(collection(db, "messages"), where("senderId", "==", myId));
    const q2 = query(collection(db, "messages"), where("receiverId", "==", myId));
    const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    
    const chatPartners: Record<string, { name: string; lastMessage: string; timestamp: string }> = {};
    
    const handleSnap = (snap: any) => {
      snap.forEach((d: any) => {
        const m = d.data() as Message;
        const isSender = m.senderId === myId;
        const partnerId = isSender ? m.receiverId : m.senderId;
        const partnerName = isSender ? m.receiverName : m.senderName;
        
        const current = chatPartners[partnerId];
        if (!current || new Date(m.timestamp).getTime() > new Date(current.timestamp).getTime()) {
          chatPartners[partnerId] = {
            name: partnerName,
            lastMessage: m.content,
            timestamp: m.timestamp
          };
        }
      });
    };
    
    handleSnap(s1);
    handleSnap(s2);
    
    return Object.entries(chatPartners).map(([userId, data]) => ({
      userId,
      ...data
    })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}

// -------------------------------------------------------------
// REVIEWS & RATINGS
// -------------------------------------------------------------

export async function addReview(revieweeId: string, rating: number, comment: string): Promise<Review> {
  if (!currentUserProfile) throw new Error("Must be logged in to review.");

  const newReview: Review = {
    id: `rev_${Date.now()}`,
    reviewerId: currentUserProfile.id,
    reviewerName: currentUserProfile.name,
    revieweeId,
    rating,
    comment,
    createdAt: new Date().toISOString()
  };

  if (useMock) {
    const reviews: Review[] = JSON.parse(localStorage.getItem('sk_reviews') || '[]');
    reviews.unshift(newReview);
    localStorage.setItem('sk_reviews', JSON.stringify(reviews));
    return newReview;
  } else {
    const docRef = await addDoc(collection(db, "reviews"), newReview);
    const saved = { ...newReview, id: docRef.id };
    await updateDoc(doc(db, "reviews", docRef.id), { id: docRef.id });
    return saved;
  }
}

export async function getReviews(revieweeId: string): Promise<Review[]> {
  if (useMock) {
    const reviews: Review[] = JSON.parse(localStorage.getItem('sk_reviews') || '[]');
    return reviews.filter(r => r.revieweeId === revieweeId);
  } else {
    const q = query(collection(db, "reviews"), where("revieweeId", "==", revieweeId));
    const snap = await getDocs(q);
    const reviews: Review[] = [];
    snap.forEach((doc) => {
      reviews.push(doc.data() as Review);
    });
    return reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

// -------------------------------------------------------------
// BASIC MODERATION: REPORT/BLOCK
// -------------------------------------------------------------

export async function reportItem(type: 'user' | 'listing', id: string): Promise<void> {
  if (useMock) {
    const reported: string[] = JSON.parse(localStorage.getItem('sk_reported') || '[]');
    const key = `${type}_${id}`;
    if (!reported.includes(key)) {
      reported.push(key);
      localStorage.setItem('sk_reported', JSON.stringify(reported));
    }
    
    // Also, if reporting a listing, we can mark it inactive locally
    if (type === 'listing') {
      const listings: Listing[] = JSON.parse(localStorage.getItem('sk_listings') || '[]');
      const index = listings.findIndex(l => l.id === id);
      if (index !== -1) {
        listings[index].status = 'closed'; // hide it
        localStorage.setItem('sk_listings', JSON.stringify(listings));
      }
    }
  } else {
    // Real Firebase report logging
    await addDoc(collection(db, "reports"), {
      reporterId: currentUserProfile?.id || "anonymous",
      type,
      targetId: id,
      timestamp: new Date().toISOString()
    });
    
    if (type === 'listing') {
      await updateDoc(doc(db, "listings", id), { status: "closed" });
    }
  }
}
