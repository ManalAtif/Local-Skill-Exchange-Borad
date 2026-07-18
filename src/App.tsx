/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  MessageSquare, 
  MapPin, 
  Sparkles, 
  Plus, 
  User, 
  BookOpen, 
  ArrowRight, 
  Star, 
  Trash2, 
  LogOut, 
  Filter, 
  CheckCircle, 
  AlertTriangle, 
  Compass, 
  Mail, 
  Lock, 
  ChevronRight,
  ChevronLeft,
  Shield,
  ThumbsUp,
  Map as MapIcon,
  MessageCircle,
  Activity,
  Award
} from 'lucide-react';
import { 
  onProfileStateChange, 
  getCurrentUserProfile, 
  signUpUser, 
  signInUser, 
  logoutUser, 
  updateUserProfile,
  createListing, 
  getListings, 
  updateListing, 
  deleteListing, 
  sendMessage, 
  getMessages, 
  subscribeToMessages,
  getActiveChats, 
  addReview, 
  getReviews, 
  reportItem,
  getDistanceKm,
  getFirebaseMode,
  UserProfile,
  Listing,
  Message,
  Review
} from './firebase';

export default function App() {
  // Auth state
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authBio, setAuthBio] = useState('');
  const [authLocation, setAuthLocation] = useState('Gulberg, Lahore');
  const [authLat, setAuthLat] = useState(31.5204);
  const [authLng, setAuthLng] = useState(74.3587);
  const [isSignUp, setIsSignUp] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // App navigation
  const [activeTab, setActiveTab] = useState<'browse' | 'matches' | 'chats' | 'my-profile'>('browse');

  // Listings data
  const [listings, setListings] = useState<Listing[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filterType, setFilterType] = useState<'all' | 'offer' | 'request'>('all');
  const [maxDistance, setMaxDistance] = useState(15); // in km

  // Selected details
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedUserReviews, setSelectedUserReviews] = useState<Review[]>([]);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  // Create Listing Modal/Form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListingTitle, setNewListingTitle] = useState('');
  const [newListingCategory, setNewListingCategory] = useState('Technology & Coding');
  const [newListingType, setNewListingType] = useState<'offer' | 'request'>('offer');
  const [newListingDesc, setNewListingDesc] = useState('');
  const [newListingAvailability, setNewListingAvailability] = useState('');
  const [newListingRadius, setNewListingRadius] = useState(5);

  // Active chat state
  const [activeChats, setActiveChats] = useState<{ userId: string; name: string; lastMessage: string; timestamp: string }[]>([]);
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);
  const [selectedChatUserName, setSelectedChatUserName] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [typedMessage, setTypedMessage] = useState('');
  const [selectedChatListing, setSelectedChatListing] = useState<{ id: string; title: string } | null>(null);

  // Moderation state
  const [reportSuccess, setReportSuccess] = useState('');

  // Location list preset to make signup simple
  const PAK_CITIES = [
    { name: "Gulberg, Lahore", lat: 31.5204, lng: 74.3587 },
    { name: "Clifton, Karachi", lat: 24.8138, lng: 67.0315 },
    { name: "F-7, Islamabad", lat: 33.7297, lng: 73.0548 },
    { name: "Saddar, Peshawar", lat: 34.0084, lng: 71.5484 },
    { name: "Samanabad, Faisalabad", lat: 31.4052, lng: 73.0697 },
    { name: "Satellite Town, Rawalpindi", lat: 33.6361, lng: 73.0714 },
    { name: "Cantt, Multan", lat: 30.1575, lng: 71.5249 }
  ];

  const CATEGORIES = [
    "Technology & Coding",
    "Languages",
    "Music & Instruments",
    "Cooking & Culinary",
    "Arts & Crafts",
    "Fitness & Sports",
    "Academic Tutoring",
    "Home Repair & Gardening"
  ];

  // Subscribe/load user session
  useEffect(() => {
    const unsub = onProfileStateChange((profile) => {
      setUser(profile);
      if (profile) {
        // Pre-fill location coordinates on auth
        setAuthLocation(profile.locationName);
        setAuthLat(profile.lat);
        setAuthLng(profile.lng);
      }
    });
    return () => unsub();
  }, []);

  // Fetch initial listings
  const loadListings = async () => {
    try {
      const data = await getListings();
      setListings(data);
    } catch (err) {
      console.error("Error loading listings:", err);
    }
  };

  useEffect(() => {
    loadListings();
  }, [user]);

  // Load active chats
  const loadChatsList = async () => {
    if (user) {
      const list = await getActiveChats();
      setActiveChats(list);
    }
  };

  useEffect(() => {
    loadChatsList();
    const interval = setInterval(loadChatsList, 4000);
    return () => clearInterval(interval);
  }, [user]);

  // Message real-time listener subscription
  useEffect(() => {
    if (user && selectedChatUserId) {
      const unsub = subscribeToMessages(selectedChatUserId, (msgs) => {
        setChatMessages(msgs);
      });
      return () => unsub();
    }
  }, [user, selectedChatUserId]);

  // Scroll to bottom of chat
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const lastChatUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedChatUserId) {
      lastChatUserIdRef.current = null;
      return;
    }

    const container = chatScrollContainerRef.current;
    if (!container) return;

    const isDifferentUser = selectedChatUserId !== lastChatUserIdRef.current;
    
    // If we changed to a different chat partner, scroll instantly to bottom
    if (isDifferentUser) {
      lastChatUserIdRef.current = selectedChatUserId;
      // Allow slight render buffer
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 30);
      return;
    }

    // If it's a new message in the same chat:
    // Only scroll to the bottom if the user is already scrolled near the bottom,
    // so we don't disrupt them if they are scrolling up reading past logs.
    const threshold = 180; // pixels from bottom
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;

    if (isNearBottom) {
      setTimeout(() => {
        if (chatBottomRef.current) {
          chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 30);
    }
  }, [chatMessages, selectedChatUserId]);

  // Auth Submit handler
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!authEmail || !authPassword) {
      setAuthError("Please fill in email and password.");
      return;
    }

    try {
      if (isSignUp) {
        if (!authName) {
          setAuthError("Please provide your name.");
          return;
        }
        await signUpUser(
          authName, 
          authEmail, 
          authPassword, 
          authLocation, 
          authLat, 
          authLng, 
          authBio || "Interested in community skill exchanges!"
        );
        setAuthSuccess("Account registered successfully!");
      } else {
        await signInUser(authEmail, authPassword);
        setAuthSuccess("Logged in successfully!");
      }
      loadListings();
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed. Check credentials.");
    }
  };

  // Quick Sign In for demo convenience
  const handleQuickSignIn = async (email: string) => {
    setAuthError('');
    setAuthSuccess('');
    try {
      await signInUser(email, "password");
      loadListings();
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  // Write new Listing
  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newListingTitle || !newListingDesc) {
      alert("Please fill in title and description.");
      return;
    }

    try {
      await createListing({
        type: newListingType,
        title: newListingTitle,
        category: newListingCategory,
        description: newListingDesc,
        availability: newListingAvailability || "Flexible schedule",
        locationName: user.locationName,
        lat: user.lat,
        lng: user.lng,
        radiusKm: Number(newListingRadius)
      });
      
      // Reset
      setNewListingTitle('');
      setNewListingDesc('');
      setNewListingAvailability('');
      setShowCreateForm(false);
      
      // Reload
      loadListings();
    } catch (err) {
      console.error(err);
    }
  };

  // Edit / Delete listings
  const handleDeleteListing = async (id: string) => {
    if (confirm("Are you sure you want to delete this listing?")) {
      await deleteListing(id);
      loadListings();
      if (selectedListing?.id === id) {
        setSelectedListing(null);
      }
    }
  };

  const handleToggleListingStatus = async (id: string, currentStatus: 'active' | 'closed') => {
    const next = currentStatus === 'active' ? 'closed' : 'active';
    await updateListing(id, { status: next });
    loadListings();
    if (selectedListing?.id === id) {
      setSelectedListing(prev => prev ? { ...prev, status: next } : null);
    }
  };

  // Message Send
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedChatUserId || !typedMessage.trim()) return;

    try {
      await sendMessage(
        selectedChatUserId,
        selectedChatUserName,
        typedMessage.trim(),
        selectedChatListing?.id,
        selectedChatListing?.title
      );
      setTypedMessage('');
      loadChatsList();
    } catch (err) {
      console.error(err);
    }
  };

  // Direct contact action
  const handleInitiateContact = (listing: Listing) => {
    if (!user) {
      alert("Please register or log in first to connect with neighbors.");
      return;
    }
    if (listing.userId === user.id) {
      alert("This is your own listing!");
      return;
    }

    // Set active target chat
    setSelectedChatUserId(listing.userId);
    setSelectedChatUserName(listing.userName);
    setSelectedChatListing({ id: listing.id, title: listing.title });
    setActiveTab('chats');
    setSelectedListing(null); // close detail drawer
  };

  // Direct chat initiated from match
  const handleContactUserDirectly = (partnerId: string, partnerName: string) => {
    if (!user) return;
    setSelectedChatUserId(partnerId);
    setSelectedChatUserName(partnerName);
    setSelectedChatListing(null);
    setActiveTab('chats');
  };

  // Write a Review
  const handleAddReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedListing) return;
    
    try {
      await addReview(selectedListing.userId, newReviewRating, newReviewComment);
      setReviewSuccess("Review submitted successfully!");
      setNewReviewComment('');
      
      // reload reviews
      const updatedReviews = await getReviews(selectedListing.userId);
      setSelectedUserReviews(updatedReviews);
    } catch (err) {
      console.error(err);
    }
  };

  // Moderate action
  const handleReportAction = async (type: 'user' | 'listing', id: string) => {
    if (confirm(`Do you want to flag and report this ${type} to system moderators for community safety reviews?`)) {
      await reportItem(type, id);
      setReportSuccess(`This ${type} has been reported. Thank you for maintaining our safe space.`);
      loadListings();
      setTimeout(() => {
        setReportSuccess('');
        setSelectedListing(null);
      }, 3000);
    }
  };

  // Profile Edit submit
  const handleUpdateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const updated = await updateUserProfile({
        name: authName,
        bio: authBio,
        locationName: authLocation,
        lat: authLat,
        lng: authLng
      });
      alert("Profile updated successfully!");
    } catch (err: any) {
      alert("Update failed: " + err.message);
    }
  };

  // Calculate distance for listing
  const getListingDistance = (listing: Listing) => {
    if (!user) return null;
    return getDistanceKm(user.lat, user.lng, listing.lat, listing.lng);
  };

  // Filters logic
  const filteredListings = listings.filter(l => {
    // 1. Text Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = l.title.toLowerCase().includes(q);
      const matchDesc = l.description.toLowerCase().includes(q);
      const matchCat = l.category.toLowerCase().includes(q);
      const matchUser = l.userName.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCat && !matchUser) return false;
    }

    // 2. Category Filter
    if (selectedCategory !== 'All' && l.category !== selectedCategory) {
      return false;
    }

    // 3. Type (Offer vs Request)
    if (filterType !== 'all' && l.type !== filterType) {
      return false;
    }

    // 4. Distance radius limit
    if (user) {
      const dist = getDistanceKm(user.lat, user.lng, l.lat, l.lng);
      if (dist > maxDistance) {
        return false;
      }
    }

    return true;
  });

  // Smart suggested matching algorithm
  // Finds reciprocal matches! 
  // User A offers category C1 and requests category C2
  // User B offers category C2 and requests category C1
  // We'll calculate pairings across our current user's lists and outer users
  const getMatchesWithReciprocity = () => {
    if (!user) return [];

    const myOffers = listings.filter(l => l.userId === user.id && l.type === 'offer');
    const myRequests = listings.filter(l => l.userId === user.id && l.type === 'request');

    const outerOffers = listings.filter(l => l.userId !== user.id && l.type === 'offer');
    const outerRequests = listings.filter(l => l.userId !== user.id && l.type === 'request');

    const matchMatches: Array<{
      id: string;
      partnerId: string;
      partnerName: string;
      partnerPhoto?: string;
      partnerBio?: string;
      distance: number;
      overlapOffers: Listing[]; // listings they offer that I want
      overlapRequests: Listing[]; // listings they want that I offer
      matchPercentage: number;
    }> = [];

    // Group outer listings by user
    const usersMap: Record<string, { name: string; photo?: string; bio?: string; lat: number; lng: number; offers: Listing[]; requests: Listing[] }> = {};
    listings.forEach(l => {
      if (l.userId === user.id) return;
      if (!usersMap[l.userId]) {
        usersMap[l.userId] = {
          name: l.userName,
          photo: l.userPhoto,
          lat: l.lat,
          lng: l.lng,
          offers: [],
          requests: []
        };
      }
      if (l.type === 'offer') usersMap[l.userId].offers.push(l);
      if (l.type === 'request') usersMap[l.userId].requests.push(l);
    });

    Object.entries(usersMap).forEach(([outerUserId, outerUserData]) => {
      // Find reciprocal opportunities
      // 1. They offer what I request
      const overlapOffers = outerUserData.offers.filter(oo => 
        myRequests.some(mr => mr.category === oo.category)
      );

      // 2. I offer what they request
      const overlapRequests = myOffers.filter(mo => 
        outerUserData.requests.some(or => or.category === mo.category)
      );

      // We only flag as a reciprocal match if there's at least one direction overlap, 
      // with a high score if there is a double overlap!
      if (overlapOffers.length > 0 || overlapRequests.length > 0) {
        const dist = getDistanceKm(user.lat, user.lng, outerUserData.lat, outerUserData.lng);
        // Calculate dynamic match %: 100% if mutual (they teach what I need AND need what I teach)
        // 50% if single-sided (e.g. they teach what I need)
        const matchPercentage = (overlapOffers.length > 0 && overlapRequests.length > 0) ? 100 : 50;

        matchMatches.push({
          id: `match_${outerUserId}`,
          partnerId: outerUserId,
          partnerName: outerUserData.name,
          partnerPhoto: outerUserData.photo,
          distance: Math.round(dist * 10) / 10,
          overlapOffers,
          overlapRequests,
          matchPercentage
        });
      }
    });

    return matchMatches.sort((a, b) => b.matchPercentage - a.matchPercentage || a.distance - b.distance);
  };

  const suggestedMatches = getMatchesWithReciprocity();

  // SVG Neighborhood Map Scale calculation
  // Pakistan coordinates scale nicely on standard viewport
  const mapWidth = 320;
  const mapHeight = 300;
  
  const scaleX = (lng: number) => {
    // Lng ranges from 61.0 to 76.0 (spanning Pakistan's major cities)
    const minLng = 61.0;
    const maxLng = 76.0;
    return ((lng - minLng) / (maxLng - minLng)) * mapWidth;
  };

  const scaleY = (lat: number) => {
    // Lat ranges from 24.0 to 37.0 (spanning Pakistan's major cities)
    const minLat = 24.0;
    const maxLat = 37.0;
    // higher lat is further up, so we do mapHeight minus scale
    return mapHeight - (((lat - minLat) / (maxLat - minLat)) * mapHeight);
  };

  // View user reviews
  const openListingDetail = async (listing: Listing) => {
    setSelectedListing(listing);
    setReviewSuccess('');
    try {
      const revs = await getReviews(listing.userId);
      setSelectedUserReviews(revs);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div id="app-root" className="w-full min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800 select-none overflow-x-hidden font-sans">
      
      {/* Global Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10 sticky top-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-500 rounded-sm flex items-center justify-center text-white font-black text-xl tracking-wider">
            S
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-slate-950">SkillExchange</span>
            <span className="text-xs bg-slate-100 text-slate-500 font-medium px-2 py-0.5 ml-2 rounded-full border border-slate-200">
              {getFirebaseMode() ? '⚡ Firestore Sync' : '💾 Offline Mode'}
            </span>
          </div>
        </div>

        {/* Global user header bar */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                <span className="text-[10px] text-slate-400 font-medium tracking-tight flex items-center justify-end gap-1">
                  <MapPin size={10} className="text-orange-500" />
                  {user.locationName.split(',')[0]}
                </span>
              </div>
              <img 
                src={user.photoUrl} 
                alt={user.name} 
                className="w-10 h-10 rounded-full border border-slate-200 object-cover bg-slate-50"
              />
              <button 
                onClick={logoutUser}
                title="Log Out"
                className="p-2 hover:bg-slate-100 rounded-sm text-slate-400 hover:text-rose-500 transition-colors"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                <Shield size={14} className="text-slate-400" />
                Guest Access
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      {!user ? (
        // AUTHENTICATION SPLIT SCREEN
        <div className="flex-1 max-w-5xl mx-auto w-full flex items-center justify-center p-6 md:py-12">
          <div className="bg-white border border-slate-200 w-full rounded-none shadow-sm grid grid-cols-1 md:grid-cols-12 overflow-hidden">
            
            {/* Left promo panel (Geometric style) */}
            <div className="hidden md:flex md:col-span-5 bg-slate-900 text-white p-8 flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl -mr-20 -mt-20"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/10 rounded-full blur-2xl -ml-20 -mb-20"></div>

              <div className="space-y-6 relative z-10">
                <span className="text-[10px] bg-indigo-500 text-white px-2.5 py-1 uppercase font-bold tracking-widest rounded-none">
                  Local Barter Network
                </span>
                <h2 className="text-2xl font-light leading-tight">
                  Trade Skills, <br />
                  Build Real <br />
                  Neighborhood Bonds.
                </h2>
                <p className="text-sm text-slate-300 font-light">
                  No subscriptions. No fees. exchange coding for guitar lessons, Spanish practice for sourdough baking, or physical workouts for home repairs!
                </p>
              </div>

              <div className="pt-8 border-t border-slate-800 space-y-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-none bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-orange-500 font-bold">1</div>
                  <span className="text-xs text-slate-300 font-medium">Post what you can teach and what you want to learn</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-none bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-indigo-500 font-bold">2</div>
                  <span className="text-xs text-slate-300 font-medium">Get matched with neighbors based on mutual trade needs</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-none bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-emerald-500 font-bold">3</div>
                  <span className="text-xs text-slate-300 font-medium">Chat, arrange, review, and grow together!</span>
                </div>
              </div>
            </div>

            {/* Right form panel */}
            <div className="col-span-12 md:col-span-7 p-8">
              <h3 className="text-xl font-bold tracking-tight text-slate-900 mb-2">
                {isSignUp ? "Create Local Account" : "Access SkillExchange Board"}
              </h3>
              <p className="text-xs text-slate-500 mb-6">
                {isSignUp ? "Become a registered peer-to-peer exchange partner in Pakistan." : "Log in to browse, post and message your neighborhood partners."}
              </p>

              {authError && (
                <div className="mb-4 p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-700 text-xs flex gap-2 rounded-none">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{authError}</span>
                </div>
              )}
              {authSuccess && (
                <div className="mb-4 p-3 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 text-xs flex gap-2 rounded-none">
                  <CheckCircle size={14} className="shrink-0" />
                  <span>{authSuccess}</span>
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {isSignUp && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
                    <input 
                      type="text" 
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="e.g. Sarah Jenkins"
                      className="w-full px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50 rounded-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                  <input 
                    type="email" 
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="e.g. sarah@example.com"
                    className="w-full px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50 rounded-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Password</label>
                  <input 
                    type="password" 
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50 rounded-none"
                  />
                </div>

                {isSignUp && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pakistan City (Pre-set Coordinates)</label>
                      <select 
                        value={authLocation}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAuthLocation(val);
                          const preset = PAK_CITIES.find(n => n.name === val);
                          if (preset) {
                            setAuthLat(preset.lat);
                            setAuthLng(preset.lng);
                          }
                        }}
                        className="w-full px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50 rounded-none"
                      >
                        {PAK_CITIES.map(n => (
                          <option key={n.name} value={n.name}>{n.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Short Bio</label>
                      <textarea 
                        value={authBio}
                        onChange={(e) => setAuthBio(e.target.value)}
                        placeholder="Tell neighbors what skills you have, what you're interested in learning, and what you represent..."
                        rows={3}
                        className="w-full px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50 rounded-none"
                      ></textarea>
                    </div>
                  </>
                )}

                <button 
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors rounded-none mt-4"
                >
                  {isSignUp ? "Sign Up as exchange Partner" : "Log In to console"}
                </button>
              </form>

              {/* Toggler */}
              <div className="mt-6 text-center">
                <button 
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setAuthError('');
                  }}
                  className="text-xs text-indigo-600 hover:underline font-semibold"
                >
                  {isSignUp ? "Already have an account? Sign In" : "Need a neighborhood profile? Sign Up Now"}
                </button>
              </div>

              {/* Quick Sign In Helpers for testing convenience */}
              <div className="mt-8 pt-6 border-t border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Quick-Test Demo Profiles</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <button 
                    onClick={() => handleQuickSignIn('ayesha@example.com')}
                    className="p-2 border border-slate-150 text-[10.5px] hover:bg-slate-50 text-left font-medium rounded-sm"
                  >
                    <p className="font-bold text-indigo-600">Ayesha K.</p>
                    <p className="text-[9px] text-slate-400 uppercase">Urdu / Figma</p>
                  </button>
                  <button 
                    onClick={() => handleQuickSignIn('zain@example.com')}
                    className="p-2 border border-slate-150 text-[10.5px] hover:bg-slate-50 text-left font-medium rounded-sm"
                  >
                    <p className="font-bold text-indigo-600">Zain A.</p>
                    <p className="text-[9px] text-slate-400 uppercase">React / Node</p>
                  </button>
                  <button 
                    onClick={() => handleQuickSignIn('faisal@example.com')}
                    className="p-2 border border-slate-150 text-[10.5px] hover:bg-slate-50 text-left font-medium rounded-sm"
                  >
                    <p className="font-bold text-indigo-600">Faisal S.</p>
                    <p className="text-[9px] text-slate-400 uppercase">Sitar music</p>
                  </button>
                  <button 
                    onClick={() => handleQuickSignIn('maryam@example.com')}
                    className="p-2 border border-slate-150 text-[10.5px] hover:bg-slate-50 text-left font-medium rounded-sm"
                  >
                    <p className="font-bold text-indigo-600">Maryam B.</p>
                    <p className="text-[9px] text-slate-400 uppercase">Mughlai Chef</p>
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      ) : (
        // MAIN APP APPLICATION INTERFACE
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT NAVIGATION COLUMN (Geometric Balance sidebar) */}
          <nav className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col py-6 shrink-0 shadow-sm">
            <div className="px-6 mb-8">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Discovery</p>
              <ul className="space-y-1">
                <li id="tab-browse">
                  <button 
                    onClick={() => setActiveTab('browse')}
                    className={`w-full flex items-center gap-3 p-3 text-sm font-semibold rounded-none transition-colors ${
                      activeTab === 'browse' ? 'bg-slate-100 text-slate-900 border-l-4 border-indigo-600 pl-2' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Compass size={16} className={activeTab === 'browse' ? 'text-indigo-600' : 'text-slate-400'} />
                    <span>Browse Board</span>
                  </button>
                </li>
                <li id="tab-matches">
                  <button 
                    onClick={() => setActiveTab('matches')}
                    className={`w-full flex items-center justify-between p-3 text-sm font-semibold rounded-none transition-colors ${
                      activeTab === 'matches' ? 'bg-slate-100 text-slate-900 border-l-4 border-orange-500 pl-2' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles size={16} className={activeTab === 'matches' ? 'text-orange-500' : 'text-slate-400'} />
                      <span>Smart Matches</span>
                    </div>
                    {suggestedMatches.length > 0 && (
                      <span className="text-[10px] bg-orange-100 text-orange-600 font-bold px-2 py-0.5 rounded-full">
                        {suggestedMatches.length}
                      </span>
                    )}
                  </button>
                </li>
              </ul>
            </div>

            <div className="px-6 mb-8">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Barter Network</p>
              <ul className="space-y-1">
                <li id="tab-chats">
                  <button 
                    onClick={() => setActiveTab('chats')}
                    className={`w-full flex items-center justify-between p-3 text-sm font-semibold rounded-none transition-colors ${
                      activeTab === 'chats' ? 'bg-slate-100 text-slate-900 border-l-4 border-indigo-600 pl-2' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare size={16} className={activeTab === 'chats' ? 'text-indigo-600' : 'text-slate-400'} />
                      <span>My Chats</span>
                    </div>
                    {activeChats.length > 0 && (
                      <span className="text-[10px] bg-indigo-100 text-indigo-600 font-bold px-2 py-0.5 rounded-full">
                        {activeChats.length}
                      </span>
                    )}
                  </button>
                </li>
              </ul>
            </div>

            <div className="px-6">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">My Account</p>
              <ul className="space-y-1">
                <li id="tab-profile">
                  <button 
                    onClick={() => setActiveTab('my-profile')}
                    className={`w-full flex items-center gap-3 p-3 text-sm font-semibold rounded-none transition-colors ${
                      activeTab === 'my-profile' ? 'bg-slate-100 text-slate-900 border-l-4 border-indigo-600 pl-2' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <User size={16} className={activeTab === 'my-profile' ? 'text-indigo-600' : 'text-slate-400'} />
                    <span>Profile & Listings</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Quick Listing button */}
            <div className="mt-auto px-6 pb-6">
              <button 
                onClick={() => setShowCreateForm(true)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition-colors rounded-none"
              >
                <Plus size={16} />
                <span>New Board Listing</span>
              </button>
            </div>
          </nav>

          {/* MAIN GRID BODY */}
          <section className="flex-1 p-6 md:p-8 grid grid-cols-1 xl:grid-cols-12 gap-8 overflow-y-auto">
            
            {/* Center column: active view contents */}
            <div className="xl:col-span-8 space-y-6">
              
              {/* BROWSE BOARD TAB */}
              {activeTab === 'browse' && (
                <div className="space-y-6">
                  {/* Title & Stats */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-slate-900 uppercase">Community Exchange Board</h2>
                      <p className="text-xs text-slate-500">Discover skills to trade in Lahore, Karachi, Islamabad, and Peshawar.</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-xs bg-white border border-slate-200 px-3 py-1.5 font-medium flex items-center gap-1.5">
                        <Activity size={14} className="text-indigo-600" />
                        <strong className="text-slate-950">{listings.length}</strong> active listings
                      </span>
                    </div>
                  </div>

                  {/* Filters block (Geometric panel) */}
                  <div className="bg-white border border-slate-200 p-4 shadow-sm flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row gap-3">
                      {/* Text Search */}
                      <div className="flex-1 relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                          <Search size={16} />
                        </span>
                        <input 
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search skill titles, names, descriptions..."
                          className="w-full pl-9 pr-3 py-2 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50 rounded-none"
                        />
                      </div>

                      {/* Category Selection */}
                      <div className="w-full md:w-56">
                        <select 
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50 rounded-none"
                        >
                          <option value="All">All Categories</option>
                          {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 border-t border-slate-100">
                      {/* Listing type toggle */}
                      <div className="flex border border-slate-200 p-0.5 bg-slate-50">
                        <button 
                          onClick={() => setFilterType('all')}
                          className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-none ${
                            filterType === 'all' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Show All
                        </button>
                        <button 
                          onClick={() => setFilterType('offer')}
                          className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-none ${
                            filterType === 'offer' ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Offers (Teaches)
                        </button>
                        <button 
                          onClick={() => setFilterType('request')}
                          className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-none ${
                            filterType === 'request' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Requests (Needs)
                        </button>
                      </div>

                      {/* Max Distance Slider */}
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Search Radius:</span>
                        <input 
                          type="range" 
                          min={1} 
                          max={30} 
                          value={maxDistance}
                          onChange={(e) => setMaxDistance(Number(e.target.value))}
                          className="accent-indigo-600 cursor-pointer w-28 md:w-36 h-1 bg-slate-200 rounded-lg appearance-none"
                        />
                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 border border-slate-200 font-mono">
                          {maxDistance}km
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Listings Grid */}
                  {filteredListings.length === 0 ? (
                    <div className="bg-white border border-slate-200 p-12 text-center shadow-sm">
                      <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-none flex items-center justify-center mx-auto mb-4">
                        <Filter size={20} />
                      </div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-1">No active listings found</h3>
                      <p className="text-xs text-slate-500">Try relaxing your search terms, selection category, or increase the search distance radius.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredListings.map(listing => {
                        const dist = getListingDistance(listing);
                        const isOwn = user?.id === listing.userId;

                        return (
                          <div 
                            key={listing.id}
                            className={`bg-white border hover:border-slate-400 transition-all p-5 shadow-xs flex flex-col justify-between group cursor-pointer ${
                              listing.type === 'offer' ? 'border-l-4 border-l-orange-400' : 'border-l-4 border-l-indigo-500'
                            }`}
                            onClick={() => openListingDetail(listing)}
                          >
                            <div>
                              {/* Card Header metadata */}
                              <div className="flex items-center justify-between gap-2 mb-3">
                                <span className={`text-[10px] font-bold px-2 py-0.5 tracking-widest uppercase ${
                                  listing.type === 'offer' 
                                    ? 'bg-orange-50 text-orange-600' 
                                    : 'bg-indigo-50 text-indigo-600'
                                }`}>
                                  {listing.type === 'offer' ? '🎓 TEACH / OFFER' : '🌱 WANT / REQUEST'}
                                </span>
                                
                                <span className="text-[10px] font-semibold text-slate-400 font-mono flex items-center gap-0.5">
                                  <MapPin size={10} className="text-orange-500" />
                                  {dist !== null ? `${Math.round(dist * 10) / 10} km` : listing.locationName.split(',')[0]}
                                </span>
                              </div>

                              {/* Title */}
                              <h3 className="text-sm font-bold text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors mb-2">
                                {listing.title}
                              </h3>

                              {/* Category tag */}
                              <p className="text-[10px] font-semibold text-slate-400 mb-3">{listing.category}</p>

                              {/* Description snippet */}
                              <p className="text-xs text-slate-600 line-clamp-3 mb-4 font-light">
                                {listing.description}
                              </p>
                            </div>

                            {/* Card Footer author */}
                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {listing.userPhoto ? (
                                  <img 
                                    src={listing.userPhoto} 
                                    alt={listing.userName} 
                                    className="w-6 h-6 rounded-full object-cover border border-slate-100 bg-slate-50"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold uppercase">
                                    {listing.userName.charAt(0)}
                                  </div>
                                )}
                                <span className="text-[11px] font-bold text-slate-700">{listing.userName}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(listing.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* SMART MATCHES TAB */}
              {activeTab === 'matches' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 uppercase">Reciprocal Peer Matches</h2>
                    <p className="text-xs text-slate-500">Based on listings you've posted, we automatically compute reciprocal exchange opportunities with local neighbors!</p>
                  </div>

                  {suggestedMatches.length === 0 ? (
                    <div className="bg-white border border-slate-200 p-12 text-center shadow-sm">
                      <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-none flex items-center justify-center mx-auto mb-4">
                        <Sparkles size={20} />
                      </div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-1">No automatic matches calculated</h3>
                      <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
                        To compute high-fidelity reciprocal matches, you need active board listings! Try posting what you can teach (Offers) and what you want to learn (Requests) first.
                      </p>
                      <button 
                        onClick={() => {
                          setActiveTab('my-profile');
                          setShowCreateForm(true);
                        }}
                        className="py-2 px-4 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded-none hover:bg-slate-800"
                      >
                        Create listing now
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {suggestedMatches.map(match => (
                        <div 
                          key={match.id}
                          className="bg-white border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row gap-6 justify-between items-stretch"
                        >
                          {/* Left Profile segment */}
                          <div className="md:w-1/3 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-6">
                            <div>
                              <div className="flex items-center gap-3 mb-3">
                                {match.partnerPhoto ? (
                                  <img 
                                    src={match.partnerPhoto} 
                                    alt={match.partnerName} 
                                    className="w-10 h-10 rounded-full border border-slate-200 bg-slate-50"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold uppercase">
                                    {match.partnerName.charAt(0)}
                                  </div>
                                )}
                                <div>
                                  <h3 className="text-sm font-bold text-slate-900">{match.partnerName}</h3>
                                  <span className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5">
                                    <MapPin size={10} className="text-orange-500" />
                                    {match.distance} km away
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-slate-500 font-light line-clamp-3">
                                {match.partnerBio}
                              </p>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Match Score:</span>
                              <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded ${
                                match.matchPercentage === 100 
                                  ? 'bg-emerald-50 text-emerald-600' 
                                  : 'bg-amber-50 text-amber-600'
                              }`}>
                                {match.matchPercentage}% {match.matchPercentage === 100 ? 'Mutual Exchange' : 'Single Overlap'}
                              </span>
                            </div>
                          </div>

                          {/* Center exchange vectors */}
                          <div className="flex-1 flex flex-col justify-center gap-4 py-2">
                            {/* What they teach that I request */}
                            {match.overlapOffers.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                  <CheckCircle size={10} className="text-emerald-500" />
                                  THEY TEACH WHAT YOU REQUESTED:
                                </span>
                                <div className="space-y-1">
                                  {match.overlapOffers.map(oo => (
                                    <p key={oo.id} className="text-xs font-semibold text-slate-800 bg-emerald-50/50 p-2 border-l-2 border-emerald-500 font-mono">
                                      {oo.title} <span className="text-slate-400">({oo.category})</span>
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* What I offer that they want */}
                            {match.overlapRequests.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                  <ThumbsUp size={10} className="text-indigo-500" />
                                  YOU TEACH WHAT THEY REQUESTED:
                                </span>
                                <div className="space-y-1">
                                  {match.overlapRequests.map(or => (
                                    <p key={or.id} className="text-xs font-semibold text-slate-800 bg-indigo-50/50 p-2 border-l-2 border-indigo-500 font-mono">
                                      {or.title} <span className="text-slate-400">({or.category})</span>
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right contact button */}
                          <div className="md:w-44 flex flex-col justify-center items-end shrink-0">
                            <button 
                              onClick={() => handleContactUserDirectly(match.partnerId, match.partnerName)}
                              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition-colors rounded-none text-center flex items-center justify-center gap-2"
                            >
                              <MessageSquare size={14} />
                              <span>Propose Trade</span>
                            </button>
                            <p className="text-[9px] text-slate-400 text-center w-full mt-2">100% free community transaction</p>
                          </div>

                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* CHATS MESSAGING TAB */}
              {activeTab === 'chats' && (
                <div className="bg-white border border-slate-200 h-[500px] md:h-[600px] flex shadow-sm overflow-hidden">
                  
                  {/* Left Chat Partners Pane */}
                  <div className={`w-full md:w-1/3 border-r border-slate-200 flex flex-col bg-slate-50 ${selectedChatUserId ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-slate-200 bg-white">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Active Peer Chats</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                      {activeChats.length === 0 ? (
                        <div className="p-6 text-center text-slate-400">
                          <p className="text-xs font-medium">No open chat dialogues.</p>
                          <p className="text-[10px] text-slate-400 mt-1">Browse listings to find partners and tap contact.</p>
                        </div>
                      ) : (
                        activeChats.map(chat => (
                          <button 
                            key={chat.userId}
                            onClick={() => {
                              setSelectedChatUserId(chat.userId);
                              setSelectedChatUserName(chat.name);
                              setSelectedChatListing(null);
                            }}
                            className={`w-full p-4 text-left transition-colors flex flex-col gap-1 ${
                              selectedChatUserId === chat.userId ? 'bg-white border-l-4 border-l-indigo-600' : 'hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900">{chat.name}</span>
                              <span className="text-[9px] text-slate-400 font-mono">
                                {new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 truncate font-light">
                              {chat.lastMessage}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right chat message area */}
                  <div className={`flex-1 flex-col bg-white ${selectedChatUserId ? 'flex' : 'hidden md:flex'}`}>
                    {selectedChatUserId ? (
                      <>
                        {/* Conversation Header */}
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setSelectedChatUserId(null)}
                              className="p-1 -ml-1 text-slate-500 hover:bg-slate-200 rounded md:hidden flex items-center justify-center"
                              title="Back to Chats List"
                              type="button"
                            >
                              <ChevronLeft size={20} />
                            </button>
                            <div>
                              <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Direct Dialogue with</p>
                              <h3 className="text-sm font-bold text-slate-900">{selectedChatUserName}</h3>
                            </div>
                          </div>
                          
                          <button 
                            onClick={() => handleReportAction('user', selectedChatUserId)}
                            className="text-[10px] font-bold text-rose-500 hover:underline flex items-center gap-1"
                          >
                            <Shield size={12} />
                            Report / Block
                          </button>
                        </div>

                        {/* Optional context label */}
                        {selectedChatListing && (
                          <div className="bg-amber-50 border-b border-amber-200 p-2.5 px-4 text-xs text-amber-800 flex items-center justify-between font-mono">
                            <span>Reference Listing: <strong>{selectedChatListing.title}</strong></span>
                            <button 
                              onClick={() => setSelectedChatListing(null)}
                              className="text-[10px] text-slate-400 hover:text-slate-600 underline font-semibold"
                            >
                              Dismiss context
                            </button>
                          </div>
                        )}

                        {/* Message log */}
                        <div ref={chatScrollContainerRef} className="flex-1 p-4 overflow-y-auto space-y-4">
                          {chatMessages.map(msg => {
                            const isMe = msg.senderId === user.id;
                            return (
                              <div 
                                key={msg.id}
                                className={`flex flex-col max-w-[75%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                              >
                                {msg.listingTitle && (
                                  <span className="text-[8px] bg-slate-100 text-slate-500 font-mono px-2 py-0.5 rounded-sm mb-1 uppercase">
                                    Ref: {msg.listingTitle}
                                  </span>
                                )}
                                <div className={`p-3 text-xs leading-relaxed font-light ${
                                  isMe 
                                    ? 'bg-slate-900 text-white rounded-none' 
                                    : 'bg-slate-100 text-slate-800 rounded-none'
                                }`}>
                                  {msg.content}
                                </div>
                                <span className="text-[8px] text-slate-400 font-mono mt-1">
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            );
                          })}
                          <div ref={chatBottomRef} />
                        </div>

                        {/* Input bar */}
                        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 flex gap-2 bg-slate-50">
                          <input 
                            type="text"
                            value={typedMessage}
                            onChange={(e) => setTypedMessage(e.target.value)}
                            placeholder="Type neighborhood trade proposal message..."
                            className="flex-1 px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 bg-white rounded-none"
                          />
                          <button 
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-none"
                          >
                            Send
                          </button>
                        </form>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                        <MessageSquare size={36} className="text-slate-200 mb-2" />
                        <h4 className="text-sm font-bold text-slate-700 uppercase">No Dialogue Active</h4>
                        <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">Select a partner from the active chat log or start a thread directly from any listing.</p>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* MY PROFILE TAB */}
              {activeTab === 'my-profile' && (
                <div className="space-y-8">
                  {/* Account detail segment */}
                  <div className="bg-white border border-slate-200 p-6 shadow-sm">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-4 pb-2 border-b border-slate-100">My Neighborhood Profile</h3>
                    
                    <form onSubmit={handleUpdateProfileSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
                          <input 
                            type="text" 
                            value={authName}
                            onChange={(e) => setAuthName(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50 rounded-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">General Location (Reference Preset)</label>
                          <select 
                            value={authLocation}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAuthLocation(val);
                              const preset = PAK_CITIES.find(n => n.name === val);
                              if (preset) {
                                setAuthLat(preset.lat);
                                setAuthLng(preset.lng);
                              }
                            }}
                            className="w-full px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50 rounded-none"
                          >
                            {PAK_CITIES.map(n => (
                              <option key={n.name} value={n.name}>{n.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">My Bio & Exchange Interests</label>
                        <textarea 
                          value={authBio}
                          onChange={(e) => setAuthBio(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50 rounded-none"
                        ></textarea>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button 
                          type="submit"
                          className="py-2 px-5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-none"
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* My listings list */}
                  <div className="bg-white border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">My Active Board Listings</h3>
                      <button 
                        onClick={() => setShowCreateForm(true)}
                        className="py-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-none flex items-center gap-1"
                      >
                        <Plus size={12} /> Add New
                      </button>
                    </div>

                    {listings.filter(l => l.userId === user.id).length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                        <p className="text-xs font-medium">You haven't posted any Board Listings yet.</p>
                        <p className="text-[10px] text-slate-400 mt-1">Post what you can offer to teach or what requests you have to get matched.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {listings.filter(l => l.userId === user.id).map(l => (
                          <div 
                            key={l.id} 
                            className="p-4 border border-slate-150 flex items-center justify-between gap-4 hover:bg-slate-50/50"
                          >
                            <div className="min-w-0">
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                l.type === 'offer' ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'
                              }`}>
                                {l.type === 'offer' ? 'Offer' : 'Request'}
                              </span>
                              <h4 className="text-xs font-bold text-slate-900 truncate mt-1">{l.title}</h4>
                              <p className="text-[10px] text-slate-400 truncate font-mono">{l.category} • Range: {l.radiusKm}km</p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button 
                                onClick={() => handleToggleListingStatus(l.id, l.status)}
                                className={`text-[10px] font-bold px-2 py-1 rounded border ${
                                  l.status === 'active' 
                                    ? 'border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100' 
                                    : 'border-slate-200 text-slate-500 bg-slate-50 hover:bg-slate-100'
                                }`}
                              >
                                {l.status === 'active' ? 'Active' : 'Closed'}
                              </button>
                              
                              <button 
                                onClick={() => handleDeleteListing(l.id)}
                                className="p-1.5 border border-rose-200 hover:bg-rose-50 text-rose-500 rounded transition-colors"
                                title="Delete Listing"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* RIGHT COLUMN: INTERACTIVE MAP & ACTIVITY LOGS (Geometric panel) */}
            <div className="xl:col-span-4 space-y-6">
              
              {/* INTERACTIVE GEOMETRIC MAP CARD */}
              <div className="bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <MapIcon size={14} className="text-orange-500" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">Exchange Map Representation</h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Pakistan National Grid</span>
                </div>

                {/* SVG MAP */}
                <div className="p-4 flex flex-col items-center justify-center bg-slate-50 border-b border-slate-100 relative">
                  <div className="absolute inset-4 border border-dashed border-slate-200 pointer-events-none opacity-40"></div>
                  
                  <svg className="w-full max-w-[320px] h-[300px] bg-slate-100 border border-slate-200 shadow-inner relative" viewBox="0 0 320 300">
                    {/* SVG Grid lines to make it look technical & clean */}
                    <line x1="80" y1="0" x2="80" y2="300" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3,3" />
                    <line x1="160" y1="0" x2="160" y2="300" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3,3" />
                    <line x1="240" y1="0" x2="240" y2="300" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3,3" />
                    <line x1="0" y1="75" x2="320" y2="75" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3,3" />
                    <line x1="0" y1="150" x2="320" y2="150" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3,3" />
                    <line x1="0" y1="225" x2="320" y2="225" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3,3" />

                    {/* Neighborhood Text labels */}
                    <text x="240" y="55" fill="#94A3B8" fontSize="8" fontWeight="bold" textAnchor="middle" letterSpacing="1" className="uppercase font-mono">Islamabad</text>
                    <text x="120" y="50" fill="#94A3B8" fontSize="8" fontWeight="bold" textAnchor="middle" letterSpacing="1" className="uppercase font-mono">Peshawar</text>
                    <text x="260" y="125" fill="#94A3B8" fontSize="8" fontWeight="bold" textAnchor="middle" letterSpacing="1" className="uppercase font-mono">Lahore</text>
                    <text x="50" y="180" fill="#94A3B8" fontSize="8" fontWeight="bold" textAnchor="middle" letterSpacing="1" className="uppercase font-mono">Quetta</text>
                    <text x="70" y="270" fill="#94A3B8" fontSize="8" fontWeight="bold" textAnchor="middle" letterSpacing="1" className="uppercase font-mono">Karachi</text>

                    {/* Indus River decorative line */}
                    <path d="M 280 20 Q 220 100 180 180 T 60 290" fill="none" stroke="#93C5FD" strokeWidth="4" strokeLinecap="round" opacity="0.4" />

                    {/* Listing points scatter */}
                    {listings.filter(l => l.status === 'active').map((l, index) => {
                      const px = scaleX(l.lng);
                      const py = scaleY(l.lat);
                      const isOwn = user?.id === l.userId;
                      const isSelected = selectedListing?.id === l.id;

                      return (
                        <g key={l.id} className="cursor-pointer" onClick={() => openListingDetail(l)}>
                          {/* Inner pulsing circle for selection */}
                          {isSelected && (
                            <circle cx={px} cy={py} r="10" fill="transparent" stroke="#6366F1" strokeWidth="1.5">
                              <animate attributeName="r" values="6;12;6" dur="2s" repeatCount="indefinite" />
                              <animate attributeName="opacity" values="1;0.2;1" dur="2s" repeatCount="indefinite" />
                            </circle>
                          )}
                          
                          <circle 
                            cx={px} 
                            cy={py} 
                            r={isSelected ? 6 : 4} 
                            fill={isOwn ? '#10B981' : (l.type === 'offer' ? '#F97316' : '#6366F1')} 
                            stroke="white" 
                            strokeWidth="1"
                            title={l.title}
                          />
                          
                          {/* Label preview */}
                          <text 
                            x={px} 
                            y={py - 8} 
                            fill="#1E293B" 
                            fontSize="7" 
                            fontWeight="bold" 
                            textAnchor="middle" 
                            className="bg-white/85 px-1 py-0.5 pointer-events-none"
                          >
                            {l.userName.split(' ')[0]}
                          </text>
                        </g>
                      );
                    })}

                    {/* Current User location point */}
                    {user && (
                      <g>
                        <circle 
                          cx={scaleX(user.lng)} 
                          cy={scaleY(user.lat)} 
                          r="6" 
                          fill="#EF4444" 
                          stroke="white" 
                          strokeWidth="1.5"
                        />
                        {/* Star icon badge indicator */}
                        <circle 
                          cx={scaleX(user.lng)} 
                          cy={scaleY(user.lat)} 
                          r="2" 
                          fill="white"
                        />
                        <text x={scaleX(user.lng)} y={scaleY(user.lat) + 14} fill="#EF4444" fontSize="7" fontWeight="bold" textAnchor="middle" className="uppercase font-mono">
                          You (Here)
                        </text>
                      </g>
                    )}
                  </svg>
                </div>

                {/* Map legends */}
                <div className="p-4 bg-white grid grid-cols-3 gap-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 justify-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 border border-white"></span>
                    <span className="text-[10px] text-slate-500 font-medium">Offers</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 border border-white"></span>
                    <span className="text-[10px] text-slate-500 font-medium">Requests</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white"></span>
                    <span className="text-[10px] text-slate-500 font-medium">Own Posts</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50">
                  <p className="text-[9px] text-slate-400 uppercase font-bold text-center leading-normal">
                    Interactive coordinates computed from authentic local neighborhood presets.
                  </p>
                </div>
              </div>

              {/* REAL-TIME SYSTEM ACTIVITY FEED */}
              <div className="bg-slate-900 text-slate-300 rounded-none shadow-md flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity size={12} className="text-indigo-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest">Local Barter Feed</h3>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">UPDATED: REALTIME</span>
                </div>

                <div className="p-5 space-y-4 max-h-[220px] overflow-y-auto">
                  <div className="relative pl-6 border-l border-slate-700 space-y-4">
                    <div className="relative">
                      <div className="absolute -left-[29px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]"></div>
                      <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Just Now</p>
                      <p className="text-xs text-slate-200">Active matching node established for <span className="text-indigo-400 font-bold">New York Metro</span>.</p>
                    </div>

                    <div className="relative">
                      <div className="absolute -left-[29px] top-1 w-2 h-2 rounded-full bg-slate-700"></div>
                      <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">10 min ago</p>
                      <p className="text-xs text-slate-200">Elena R. responded to Sarah J.'s <span className="text-orange-400 font-mono">Classical Guitar</span> proposal.</p>
                    </div>

                    <div className="relative">
                      <div className="absolute -left-[29px] top-1 w-2 h-2 rounded-full bg-slate-700"></div>
                      <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">1 hour ago</p>
                      <p className="text-xs text-slate-200">Marcus C. updated listing: <span className="text-white underline underline-offset-2">React Coding help</span>.</p>
                    </div>

                    <div className="relative">
                      <div className="absolute -left-[29px] top-1 w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]"></div>
                      <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">4 hours ago</p>
                      <p className="text-xs text-slate-200">New skill category approved: <span className="text-amber-400 font-mono">Home Repair & Gardening</span></p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 border-t border-slate-800 text-center">
                  <span className="text-[9px] text-slate-500 uppercase tracking-wide">
                    Community exchange network established in July 2026.
                  </span>
                </div>
              </div>

            </div>

          </section>
        </div>

        {/* BOTTOM NAVIGATION FOR MOBILE DEVICES */}
        <div className="md:hidden border-t border-slate-200 bg-white h-16 flex items-center justify-around shrink-0 z-30 sticky bottom-0">
          <button 
            onClick={() => setActiveTab('browse')}
            className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors ${
              activeTab === 'browse' ? 'text-indigo-600 font-bold' : 'text-slate-400'
            }`}
          >
            <Compass size={18} />
            <span className="text-[9px] mt-0.5 tracking-tight">Browse</span>
          </button>
          <button 
            onClick={() => setActiveTab('matches')}
            className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors relative ${
              activeTab === 'matches' ? 'text-orange-500 font-bold' : 'text-slate-400'
            }`}
          >
            <Sparkles size={18} />
            {suggestedMatches.length > 0 && (
              <span className="absolute top-1.5 right-6 text-[8px] bg-orange-500 text-white font-bold px-1 rounded-full scale-90">
                {suggestedMatches.length}
              </span>
            )}
            <span className="text-[9px] mt-0.5 tracking-tight">Matches</span>
          </button>
          <button 
            onClick={() => setActiveTab('chats')}
            className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors relative ${
              activeTab === 'chats' ? 'text-indigo-600 font-bold' : 'text-slate-400'
            }`}
          >
            <MessageSquare size={18} />
            {activeChats.length > 0 && (
              <span className="absolute top-1.5 right-6 text-[8px] bg-indigo-600 text-white font-bold px-1 rounded-full scale-90">
                {activeChats.length}
              </span>
            )}
            <span className="text-[9px] mt-0.5 tracking-tight">Chats</span>
          </button>
          <button 
            onClick={() => setActiveTab('my-profile')}
            className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors ${
              activeTab === 'my-profile' ? 'text-indigo-600 font-bold' : 'text-slate-400'
            }`}
          >
            <User size={18} />
            <span className="text-[9px] mt-0.5 tracking-tight">Profile</span>
          </button>
        </div>

        {/* Floating action button on mobile */}
        {user && activeTab === 'browse' && (
          <button 
            onClick={() => setShowCreateForm(true)}
            className="md:hidden fixed bottom-20 right-6 w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl z-30 transition-all active:scale-95 cursor-pointer border border-indigo-500"
            title="New Listing"
            type="button"
          >
            <Plus size={24} />
          </button>
        )}

      </div>
      )}

      {/* CREATE NEW LISTING FORM MODAL */}
      {showCreateForm && user && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 max-w-lg w-full shadow-2xl overflow-hidden rounded-none">
            
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-950 flex items-center gap-2">
                <Plus size={16} className="text-indigo-600" />
                Post New Skill Listing
              </h3>
              <button 
                onClick={() => setShowCreateForm(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                ✕ CLOSE
              </button>
            </div>

            <form onSubmit={handleCreateListing} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Type Selection */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Listing Type</label>
                  <select 
                    value={newListingType}
                    onChange={(e) => setNewListingType(e.target.value as 'offer' | 'request')}
                    className="w-full px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50 rounded-none font-bold"
                  >
                    <option value="offer">🎓 I can Offer / Teach (Offer)</option>
                    <option value="request">🌱 I want to Learn / Need (Request)</option>
                  </select>
                </div>

                {/* Category Selection */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Skill Category</label>
                  <select 
                    value={newListingCategory}
                    onChange={(e) => setNewListingCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50 rounded-none"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Title (Summarize what you exchange)</label>
                <input 
                  type="text"
                  value={newListingTitle}
                  onChange={(e) => setNewListingTitle(e.target.value)}
                  placeholder="e.g. Conversational French Practice / Beginner Guitar"
                  className="w-full px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50 rounded-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description (Explain your skill levels and requirements)</label>
                <textarea 
                  value={newListingDesc}
                  onChange={(e) => setNewListingDesc(e.target.value)}
                  rows={4}
                  placeholder="Introduce yourself, discuss what levels of experience you accommodate, details about typical topics covered, and what makes you excited about peer-to-peer barter trading!"
                  className="w-full px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50 rounded-none font-light"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Availability */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">My Availability</label>
                  <input 
                    type="text"
                    value={newListingAvailability}
                    onChange={(e) => setNewListingAvailability(e.target.value)}
                    placeholder="e.g. Weekend afternoons / weekday evenings"
                    className="w-full px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50 rounded-none"
                  />
                </div>

                {/* Range search */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Preferred Max Distance Radius</label>
                  <select 
                    value={newListingRadius}
                    onChange={(e) => setNewListingRadius(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50 rounded-none font-mono"
                  >
                    <option value={3}>3 km radius</option>
                    <option value={5}>5 km radius</option>
                    <option value={8}>8 km radius</option>
                    <option value={10}>10 km radius</option>
                    <option value={15}>15 km radius</option>
                    <option value={20}>20 km radius</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button 
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="py-2 px-4 border border-slate-200 text-slate-500 text-xs font-bold uppercase hover:bg-slate-50 rounded-none"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-none"
                >
                  Post to Active Board
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* DETAILED VIEW DRAWER / MODAL */}
      {selectedListing && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-slate-200 shadow-2xl z-40 flex flex-col justify-between overflow-y-auto animate-slide-in">
          
          {/* Header */}
          <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
            <div>
              <span className="text-[8px] font-bold bg-slate-200 px-2 py-0.5 rounded tracking-widest uppercase text-slate-600">
                Peer Listing Detail
              </span>
              <h3 className="text-sm font-bold text-slate-900 truncate mt-1">
                {selectedListing.title}
              </h3>
            </div>
            <button 
              onClick={() => setSelectedListing(null)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 p-1"
            >
              ✕ CLOSE
            </button>
          </div>

          {/* Details body */}
          <div className="flex-1 p-6 space-y-6">
            {reportSuccess && (
              <div className="p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-700 text-xs flex gap-2 rounded-none">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{reportSuccess}</span>
              </div>
            )}

            {/* Author box */}
            <div className="p-4 bg-slate-50 border border-slate-200 flex items-start gap-3">
              {selectedListing.userPhoto ? (
                <img 
                  src={selectedListing.userPhoto} 
                  alt={selectedListing.userName} 
                  className="w-12 h-12 rounded-full border border-slate-200 object-cover bg-slate-50"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold uppercase">
                  {selectedListing.userName.charAt(0)}
                </div>
              )}
              
              <div className="flex-1">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Active Exchange Partner</p>
                <h4 className="text-sm font-bold text-slate-900">{selectedListing.userName}</h4>
                <p className="text-xs text-slate-500 font-mono mt-1 flex items-center gap-1">
                  <MapPin size={10} className="text-orange-500" />
                  {selectedListing.locationName}
                </p>
              </div>
            </div>

            {/* Exchange stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border border-slate-150 bg-white">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Listing Type</p>
                <span className={`text-xs font-bold uppercase ${
                  selectedListing.type === 'offer' ? 'text-orange-600' : 'text-indigo-600'
                }`}>
                  {selectedListing.type === 'offer' ? '🎓 Offer (Teaches)' : '🌱 Request (Needs)'}
                </span>
              </div>

              <div className="p-3 border border-slate-150 bg-white">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Category</p>
                <span className="text-xs font-semibold text-slate-800 truncate block">
                  {selectedListing.category}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">About this Exchange</h4>
              <p className="text-xs text-slate-700 font-light leading-relaxed whitespace-pre-wrap">
                {selectedListing.description}
              </p>
            </div>

            {/* Availability */}
            <div className="space-y-1 p-3 bg-indigo-50/30 border border-indigo-100">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Availability Info</h4>
              <p className="text-xs text-indigo-950 font-medium">
                {selectedListing.availability || 'Flexible Schedule'}
              </p>
            </div>

            {/* Distance boundary */}
            <div className="flex items-center justify-between text-xs text-slate-500 py-2 border-t border-b border-slate-100">
              <span className="flex items-center gap-1 font-medium text-slate-400">
                <Compass size={14} />
                Search Distance Preference:
              </span>
              <span className="font-bold font-mono text-slate-800">
                Within {selectedListing.radiusKm} km
              </span>
            </div>

            {/* Reviews list for this user */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1">
                  <Award size={14} className="text-amber-500" />
                  Exchange Reviews ({selectedUserReviews.length})
                </h4>
              </div>

              {selectedUserReviews.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No historical feedback on file yet. Complete an exchange to leave a review!</p>
              ) : (
                <div className="space-y-3">
                  {selectedUserReviews.map(r => (
                    <div key={r.id} className="p-3 bg-slate-50 border border-slate-150">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10.5px] font-bold text-slate-800">{r.reviewerName}</span>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              size={10} 
                              className={i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} 
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600 font-light leading-normal">{r.comment}</p>
                      <span className="text-[8px] text-slate-400 font-mono block text-right mt-1">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Form to leave a review */}
              {user && user.id !== selectedListing.userId && (
                <form onSubmit={handleAddReviewSubmit} className="p-4 border border-dashed border-slate-200 mt-4 space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Log completed Exchange Review</p>
                  
                  {reviewSuccess && (
                    <p className="text-[10px] text-emerald-600 font-bold bg-emerald-50 p-2 border-l-2 border-emerald-500">{reviewSuccess}</p>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Rating:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(val => (
                        <button 
                          key={val} 
                          type="button"
                          onClick={() => setNewReviewRating(val)}
                          className="focus:outline-none"
                        >
                          <Star 
                            size={16} 
                            className={val <= newReviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 hover:text-amber-300'} 
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea 
                    value={newReviewComment}
                    onChange={(e) => setNewReviewComment(e.target.value)}
                    placeholder="Describe how the skill barter exchange went! Was it helpful? What did they teach?"
                    rows={2}
                    className="w-full p-2 border border-slate-200 text-xs bg-slate-50 rounded-none focus:outline-none focus:border-indigo-500"
                  ></textarea>

                  <button 
                    type="submit"
                    className="w-full py-1.5 bg-slate-950 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-slate-800"
                  >
                    Submit Review feedback
                  </button>
                </form>
              )}
            </div>

            {/* Moderation section */}
            {user && user.id !== selectedListing.userId && (
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
                <button 
                  onClick={() => handleReportAction('listing', selectedListing.id)}
                  className="text-[10px] font-bold text-rose-500 hover:underline flex items-center gap-1.5"
                >
                  <Shield size={12} />
                  Flag Listing as Unsafe
                </button>
              </div>
            )}
          </div>

          {/* Action buttons footer */}
          <div className="p-5 border-t border-slate-100 bg-slate-50 sticky bottom-0 flex gap-2">
            {user?.id !== selectedListing.userId ? (
              <button 
                onClick={() => handleInitiateContact(selectedListing)}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition-colors rounded-none text-center flex items-center justify-center gap-2"
              >
                <MessageSquare size={14} />
                <span>Initiate Barter exchange</span>
              </button>
            ) : (
              <div className="flex-1 flex gap-2">
                <button 
                  onClick={() => handleToggleListingStatus(selectedListing.id, selectedListing.status)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[10px] uppercase tracking-wider border border-slate-200"
                >
                  Toggle Active/Close
                </button>
                <button 
                  onClick={() => handleDeleteListing(selectedListing.id)}
                  className="py-2 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[10px] uppercase tracking-wider border border-rose-200"
                >
                  Delete
                </button>
              </div>
            )}
          </div>

        </div>
      )}

      {/* FOOTER */}
      <footer className="hidden md:flex h-10 bg-slate-900 border-t border-slate-800 items-center justify-between px-6 shrink-0 text-slate-500 text-[10px] font-mono select-none">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
          <span className="uppercase tracking-widest">Pakistan community active exchange ring</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Active listings index verified</span>
          <span className="text-slate-700">|</span>
          <span className="text-indigo-400">SkillExchange v1.2</span>
        </div>
      </footer>

    </div>
  );
}
