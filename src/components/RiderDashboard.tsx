import React, { useState, useEffect } from 'react';
import { User, LocationPoint, VehicleType, Trip } from '../types';
import { LeafletMap } from './LeafletMap';
import { VEHICLE_TARIFFS, calculateDistanceKm, calculateEstimatedMins, calculateFare, searchLocationOSM, reverseGeocodeOSM, PAKISTAN_CITIES } from '../utils/geo';
import { api } from '../api/client';
import { MapPin, Navigation, Search, Car, Bike, Sparkles, Phone, Star, CheckCircle, Clock, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Props {
  user: User;
  onOpenRideHistory: () => void;
}

export const RiderDashboard: React.FC<Props> = ({ user, onOpenRideHistory }) => {
  // Map Center (Default Lahore)
  const [mapCenter, setMapCenter] = useState<[number, number]>([31.5204, 74.3587]);
  const [pickup, setPickup] = useState<LocationPoint | null>({
    lat: 31.5204,
    lng: 74.3587,
    address: 'Liberty Market, Gulberg III, Lahore',
  });
  const [dropoff, setDropoff] = useState<LocationPoint | null>({
    lat: 31.5400,
    lng: 74.3800,
    address: 'DHA Phase 5, Commercial Area, Lahore',
  });

  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('Mini');
  const [nearbyDrivers, setNearbyDrivers] = useState<any[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);

  // Search queries
  const [searchPickupQuery, setSearchPickupQuery] = useState('');
  const [searchDropoffQuery, setSearchDropoffQuery] = useState('');
  const [pickupSearchResults, setPickupSearchResults] = useState<any[]>([]);
  const [dropoffSearchResults, setDropoffSearchResults] = useState<any[]>([]);
  const [isSearchingPickup, setIsSearchingPickup] = useState(false);
  const [isSearchingDropoff, setIsSearchingDropoff] = useState(false);

  // Rating modal state
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const [isRequesting, setIsRequesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch nearby drivers and active trip periodically
  useEffect(() => {
    fetchNearby();
    checkActiveTrip();

    const interval = setInterval(() => {
      fetchNearby();
      checkActiveTrip();
    }, 4000);

    return () => clearInterval(interval);
  }, [pickup, selectedVehicle]);

  const fetchNearby = async () => {
    if (!pickup) return;
    try {
      const res = await api.getNearbyDrivers(pickup.lat, pickup.lng, selectedVehicle);
      setNearbyDrivers(res.drivers || []);
    } catch (e) {
      // silent
    }
  };

  const checkActiveTrip = async () => {
    try {
      const res = await api.getActiveTrip(user.id, 'rider');
      if (res.active_trip) {
        setActiveTrip(res.active_trip);
        if (res.active_trip.status === 'completed' && !res.active_trip.driver_rating) {
          setShowRatingModal(true);
        }
      } else {
        if (activeTrip && activeTrip.status === 'in_progress') {
          // just completed
          setShowRatingModal(true);
        }
        setActiveTrip(null);
      }
    } catch (e) {
      // silent
    }
  };

  // Get current device GPS
  const handleUseCurrentGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const addr = await reverseGeocodeOSM(lat, lng);
          const p = { lat, lng, address: addr };
          setPickup(p);
          setMapCenter([lat, lng]);
        },
        (err) => {
          setErrorMsg('GPS location permission denied. You can select location on map or search address.');
        }
      );
    }
  };

  // Handle map click for setting pickup or dropoff
  const handleMapClick = async (lat: number, lng: number) => {
    const addr = await reverseGeocodeOSM(lat, lng);
    if (!pickup) {
      setPickup({ lat, lng, address: addr });
    } else if (!dropoff) {
      setDropoff({ lat, lng, address: addr });
    } else {
      // update dropoff
      setDropoff({ lat, lng, address: addr });
    }
  };

  // Search address handlers
  const handleSearchPickup = async (val: string) => {
    setSearchPickupQuery(val);
    if (val.length >= 3) {
      setIsSearchingPickup(true);
      const results = await searchLocationOSM(val);
      setPickupSearchResults(results);
      setIsSearchingPickup(false);
    } else {
      setPickupSearchResults([]);
    }
  };

  const handleSearchDropoff = async (val: string) => {
    setSearchDropoffQuery(val);
    if (val.length >= 3) {
      setIsSearchingDropoff(true);
      const results = await searchLocationOSM(val);
      setDropoffSearchResults(results);
      setIsSearchingDropoff(false);
    } else {
      setDropoffSearchResults([]);
    }
  };

  // Distance & Fare Calculations
  const distanceKm = pickup && dropoff ? calculateDistanceKm(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng) : 5.2;
  const estimatedMins = calculateEstimatedMins(distanceKm, selectedVehicle);
  const estimatedFare = calculateFare(distanceKm, selectedVehicle);

  const handleRequestRide = async () => {
    if (!pickup || !dropoff) {
      setErrorMsg('Please select both pickup and dropoff locations.');
      return;
    }
    setIsRequesting(true);
    setErrorMsg('');
    try {
      const res = await api.requestRide({
        rider_id: user.id,
        vehicle_type: selectedVehicle,
        pickup_address: pickup.address,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_address: dropoff.address,
        dropoff_lat: dropoff.lat,
        dropoff_lng: dropoff.lng,
        fare_amount: estimatedFare,
        distance_km: distanceKm,
        estimated_mins: estimatedMins,
      });
      setActiveTrip(res.trip);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to request ride');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleCancelTrip = async () => {
    if (!activeTrip) return;
    try {
      await api.cancelTrip(activeTrip.id, 'Cancelled by rider');
      setActiveTrip(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to cancel trip');
    }
  };

  const handleSubmitRating = async () => {
    if (!activeTrip) return;
    try {
      await api.rateTrip(activeTrip.id, ratingStars, 'rider');
      setRatingSubmitted(true);
      confetti({ particleCount: 50 });
      setTimeout(() => {
        setShowRatingModal(false);
        setRatingSubmitted(false);
        setActiveTrip(null);
      }, 1500);
    } catch (err: any) {
      setErrorMsg('Failed to submit rating');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
      {/* City Quick Selector Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
        <span className="font-bold text-slate-500 shrink-0 uppercase tracking-widest text-[10px]">Quick Cities:</span>
        {PAKISTAN_CITIES.map((city) => (
          <button
            key={city.name}
            onClick={() => {
              setMapCenter([city.lat, city.lng]);
              setPickup({ lat: city.lat, lng: city.lng, address: city.address });
            }}
            className="px-3.5 py-1.5 bg-white border border-slate-200 hover:border-yellow-400 hover:bg-yellow-400 hover:text-slate-950 text-slate-700 font-bold rounded-full shadow-2xs transition-all shrink-0"
          >
            📍 {city.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Leaflet Map Bento Card */}
        <div className="lg:col-span-7 space-y-4 bg-white border border-slate-200 rounded-[32px] p-3 shadow-sm overflow-hidden">
          <div className="relative">
            <LeafletMap
              center={mapCenter}
              zoom={14}
              pickup={pickup}
              dropoff={dropoff}
              drivers={nearbyDrivers}
              activeDriverLocation={
                activeTrip?.driver_info
                  ? [activeTrip.driver_info.current_lat, activeTrip.driver_info.current_lng]
                  : null
              }
              onMapClick={handleMapClick}
              heightClass="h-[380px] sm:h-[480px] lg:h-[530px]"
            />

            {/* Floating GPS Button */}
            <button
              onClick={handleUseCurrentGPS}
              className="absolute top-4 right-4 z-10 p-3 bg-white text-slate-900 rounded-full shadow-md hover:bg-slate-50 border border-slate-200 transition-all flex items-center gap-2 text-xs font-bold"
              title="Use Current GPS"
            >
              <Navigation className="w-4 h-4 text-slate-900 fill-yellow-400" />
              <span className="hidden sm:inline">Use GPS Location</span>
            </button>
          </div>
        </div>

        {/* Right Column: Booking Controls / Active Status */}
        <div className="lg:col-span-5 space-y-5">
          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium flex items-center justify-between">
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg('')} className="text-rose-400 hover:text-rose-700 font-bold">✕</button>
            </div>
          )}

          {/* ACTIVE TRIP DISPLAY */}
          {activeTrip ? (
            <div className="p-6 bg-slate-900 text-white rounded-[32px] shadow-lg border border-slate-800 space-y-5 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-yellow-400 text-slate-950">
                    {activeTrip.status.toUpperCase()}
                  </span>
                  <h3 className="text-lg font-black text-white mt-2">
                    {activeTrip.status === 'requested' && 'Searching Nearby Driver...'}
                    {activeTrip.status === 'accepted' && 'Driver Assigned & On The Way!'}
                    {activeTrip.status === 'in_progress' && 'Trip In Progress'}
                  </h3>
                </div>

                <button
                  onClick={handleCancelTrip}
                  className="px-3.5 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-950/40 border border-rose-800/50 rounded-full transition-all"
                >
                  Cancel Ride
                </button>
              </div>

              {/* Driver Details Card (If assigned) */}
              {activeTrip.driver_info && (
                <div className="p-4 bg-slate-800/90 text-white rounded-2xl border border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-yellow-400 text-slate-950 font-black text-lg flex items-center justify-center">
                        {activeTrip.driver_info.full_name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">{activeTrip.driver_info.full_name}</h4>
                        <div className="flex items-center gap-1 text-xs text-yellow-400">
                          <Star className="w-3.5 h-3.5 fill-yellow-400" />
                          <span>{activeTrip.driver_info.rating} Rating</span>
                        </div>
                      </div>
                    </div>
                    <a
                      href={`tel:${activeTrip.driver_info.mobile_number}`}
                      className="p-2.5 px-4 bg-yellow-400 text-slate-950 rounded-full hover:bg-yellow-300 transition-colors font-bold text-xs flex items-center gap-1.5 shadow-sm"
                    >
                      <Phone className="w-4 h-4" /> Call
                    </a>
                  </div>

                  <div className="pt-2 border-t border-slate-700 grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-widest">Vehicle</span>
                      <span className="font-semibold">{activeTrip.driver_info.vehicle_brand} {activeTrip.driver_info.vehicle_model}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-widest">Licence Plate</span>
                      <span className="font-mono font-bold text-yellow-400">{activeTrip.driver_info.vehicle_reg_number}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Route Summary */}
              <div className="space-y-2 text-xs text-slate-300 bg-slate-800/60 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-400 block text-[10px] uppercase tracking-widest">PICKUP</span>
                    <span className="font-semibold">{activeTrip.pickup_address}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 pt-2 border-t border-slate-700/60">
                  <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-400 block text-[10px] uppercase tracking-widest">DROPOFF</span>
                    <span className="font-semibold">{activeTrip.dropoff_address}</span>
                  </div>
                </div>
              </div>

              {/* Cash Fare Info */}
              <div className="p-4 bg-yellow-400 text-slate-950 rounded-2xl flex items-center justify-between font-bold">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest block text-slate-900">Pay Direct Cash</span>
                  <span className="text-xs text-slate-900">Zero platform fee</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-slate-950">PKR {activeTrip.fare_amount}</span>
                </div>
              </div>
            </div>
          ) : (
            /* RIDE BOOKING PANEL */
            <div className="p-6 bg-white rounded-[32px] shadow-sm border border-slate-200 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Where to next?</h3>
                <span className="px-3 py-1 bg-yellow-400/20 text-slate-900 rounded-full text-xs font-bold border border-yellow-400/40">
                  0% Commission
                </span>
              </div>

              {/* Location Inputs */}
              <div className="space-y-3">
                {/* Pickup Search */}
                <div className="relative">
                  <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-widest">Pickup Location</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-3.5 text-emerald-600" />
                    <input
                      type="text"
                      placeholder="Search pickup address..."
                      value={searchPickupQuery || (pickup?.address || '')}
                      onChange={(e) => handleSearchPickup(e.target.value)}
                      className="w-full pl-9 pr-8 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                    {isSearchingPickup && <RefreshCw className="w-3.5 h-3.5 absolute right-3 top-4 animate-spin text-slate-400" />}
                  </div>

                  {pickupSearchResults.length > 0 && (
                    <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto">
                      {pickupSearchResults.map((res, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            setPickup({ lat: res.lat, lng: res.lon, address: res.display_name });
                            setMapCenter([res.lat, res.lon]);
                            setPickupSearchResults([]);
                            setSearchPickupQuery('');
                          }}
                          className="p-3 text-xs text-slate-700 hover:bg-yellow-400/10 cursor-pointer border-b border-slate-100 last:border-none font-medium"
                        >
                          📍 {res.display_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dropoff Search */}
                <div className="relative">
                  <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-widest">Dropoff Location</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-3.5 text-rose-600" />
                    <input
                      type="text"
                      placeholder="Search dropoff destination..."
                      value={searchDropoffQuery || (dropoff?.address || '')}
                      onChange={(e) => handleSearchDropoff(e.target.value)}
                      className="w-full pl-9 pr-8 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                    {isSearchingDropoff && <RefreshCw className="w-3.5 h-3.5 absolute right-3 top-4 animate-spin text-slate-400" />}
                  </div>

                  {dropoffSearchResults.length > 0 && (
                    <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto">
                      {dropoffSearchResults.map((res, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            setDropoff({ lat: res.lat, lng: res.lon, address: res.display_name });
                            setDropoffSearchResults([]);
                            setSearchDropoffQuery('');
                          }}
                          className="p-3 text-xs text-slate-700 hover:bg-yellow-400/10 cursor-pointer border-b border-slate-100 last:border-none font-medium"
                        >
                          🚩 {res.display_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Vehicle Tariff Selector */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest">Select Ride Category</label>
                <div className="space-y-2">
                  {(Object.keys(VEHICLE_TARIFFS) as VehicleType[]).map((vKey) => {
                    const tariff = VEHICLE_TARIFFS[vKey];
                    const isSelected = selectedVehicle === vKey;
                    const fare = calculateFare(distanceKm, vKey);

                    return (
                      <div
                        key={vKey}
                        onClick={() => setSelectedVehicle(vKey)}
                        className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-yellow-400/15 border-yellow-400 shadow-2xs'
                            : 'bg-white border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                            isSelected ? 'bg-yellow-400 text-slate-950 shadow-2xs' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {vKey === 'Bike' ? '🏍️' : vKey === 'Rickshaw' ? '🛺' : '🚗'}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-xs text-slate-900">{tariff.name}</h4>
                            <p className="text-[10px] text-slate-500 font-medium">{tariff.description}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-base font-black text-slate-900">PKR {fare}</span>
                          <span className="text-[10px] text-slate-400 font-bold block">{estimatedMins} mins</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fare Summary & Request Button */}
              <div className="pt-2">
                <button
                  onClick={handleRequestRide}
                  disabled={isRequesting || !pickup || !dropoff}
                  className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-base rounded-full shadow-md flex items-center justify-center gap-2 transition-all transform active:scale-98 disabled:opacity-50"
                >
                  <Car className="w-5 h-5" />
                  {isRequesting ? 'Creating Request...' : `Request ${selectedVehicle} (PKR ${estimatedFare})`}
                </button>

                <div className="flex items-center justify-between mt-3 text-[11px] text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-900" /> Pay Direct Cash to Driver
                  </span>
                  <button onClick={onOpenRideHistory} className="text-slate-900 font-bold hover:underline">
                    View History →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RATING MODAL */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white p-6 rounded-3xl shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl font-bold">
              🎉
            </div>
            <h3 className="text-xl font-black text-slate-900">Trip Completed!</h3>
            <p className="text-xs text-slate-600">Please pay direct cash to your driver and rate your experience.</p>

            <div className="flex justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRatingStars(star)}
                  className="p-1 transition-transform transform hover:scale-125"
                >
                  <Star className={`w-8 h-8 ${star <= ratingStars ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                </button>
              ))}
            </div>

            <button
              onClick={handleSubmitRating}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all"
            >
              {ratingSubmitted ? 'Thank you!' : 'Submit 5-Star Rating'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
