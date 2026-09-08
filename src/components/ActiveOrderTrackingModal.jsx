import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  ArrowLeft, 
  Phone, 
  MessageCircle, 
  Receipt, 
  Soup, 
  Bike, 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  MapPin, 
  RotateCcw,
  Sparkles
} from 'lucide-react';

export default function ActiveOrderTrackingModal({ order, onClose, allShops = [] }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeGroupRef = useRef(null);
  const [showItems, setShowItems] = useState(false);
  const [closing, setClosing] = useState(false);

  const shop = allShops.find(s => s.id === order?.shopId) || {
    name: 'Vrinda Cloud Kitchen',
    coordinates: { lat: 27.5706, lng: 77.6593 }
  };

  const handleAnimatedClose = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 220);
  };

  // Coordinates setup
  const shopLat = parseFloat(shop?.coordinates?.lat) || 27.5706;
  const shopLng = parseFloat(shop?.coordinates?.lng) || 77.6593;

  const destLat = parseFloat(order?.deliveryCoordinates?.lat) || (shopLat + 0.007);
  const destLng = parseFloat(order?.deliveryCoordinates?.lng) || (shopLng + 0.005);

  const midLat = (shopLat + destLat) / 2;
  const midLng = (shopLng + destLng) / 2;

  // Initialize Carto Leaflet Map
  useEffect(() => {
    if (!order || !mapContainerRef.current) return;

    if (mapContainerRef.current._leaflet_id) {
      mapContainerRef.current._leaflet_id = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [midLat, midLng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false
    });

    // CARTO Voyager / Light Tiles
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 20,
        minZoom: 3,
        subdomains: 'abcd'
      }
    ).addTo(map);

    const group = L.featureGroup();

    // 1. Origin Store Pin: Neon Green Dot with Black Ring
    const originIcon = L.divIcon({
      className: 'carto-origin-dot',
      html: `
        <div style="
          width: 22px;
          height: 22px;
          background: #18181A;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(0,0,0,0.4);
        ">
          <div style="
            width: 12px;
            height: 12px;
            background: #E0FF33;
            border-radius: 50%;
            box-shadow: 0 0 10px #E0FF33;
          "></div>
        </div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });
    const storeMarker = L.marker([shopLat, shopLng], { icon: originIcon });
    storeMarker.bindTooltip(shop?.name || 'Kitchen Store', { permanent: false, direction: 'top' });
    group.addLayer(storeMarker);

    // 2. Destination House Pin: Black Circle with White Home Icon
    const destIcon = L.divIcon({
      className: 'carto-dest-badge',
      html: `
        <div style="
          width: 36px;
          height: 36px;
          background: #18181A;
          border: 2px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(0,0,0,0.45);
          color: white;
          font-size: 16px;
        ">
          ⌂
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
    const destMarker = L.marker([destLat, destLng], { icon: destIcon });
    destMarker.bindTooltip('Your Delivery Address', { permanent: false, direction: 'top' });
    group.addLayer(destMarker);

    // 3. Crisp Black Solid Navigation Path
    const routeLine = L.polyline([
      [shopLat, shopLng],
      [shopLat + 0.002, shopLng + 0.001],
      [midLat, midLng - 0.001],
      [midLat + 0.002, midLng + 0.002],
      [destLat, destLng]
    ], {
      color: '#18181A',
      weight: 4,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    });
    group.addLayer(routeLine);

    group.addTo(map);
    routeGroupRef.current = group;
    mapInstanceRef.current = map;

    // Fit route bounds nicely
    map.fitBounds(group.getBounds(), {
      paddingTopLeft: [40, 40],
      paddingBottomRight: [40, 140],
      maxZoom: 16
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [order?.id, shopLat, shopLng, destLat, destLng]);

  const handleRecenter = () => {
    if (mapInstanceRef.current && routeGroupRef.current) {
      mapInstanceRef.current.fitBounds(routeGroupRef.current.getBounds(), {
        paddingTopLeft: [40, 40],
        paddingBottomRight: [40, 140],
        maxZoom: 16,
        animate: true
      });
    }
  };

  // Step Status Calculations
  const status = order?.status || 'new';
  const isStep1 = true; // Order placed
  const isStep2 = ['preparing', 'ready_for_pickup', 'out_for_delivery', 'completed'].includes(status);
  const isStep3 = ['out_for_delivery', 'completed'].includes(status);
  const isStep4 = status === 'completed';

  const getStatusText = () => {
    switch (status) {
      case 'new':
      case 'preparing':
        return 'Kitchen is preparing your divine Prasad!';
      case 'ready_for_pickup':
        return 'Order is packed and ready for rider pickup!';
      case 'out_for_delivery':
        return 'Your order is already on its way to you!';
      case 'completed':
        return 'Order has been delivered safely. Radhe Radhe!';
      default:
        return 'Your order is being processed.';
    }
  };

  const getEstimatedTime = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 25);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-[2px] transition-opacity duration-200 ${closing ? 'opacity-0' : 'opacity-100'}`}>
      
      {/* Phone Mock / Modal Container */}
      <div className={`w-full max-w-[430px] bg-[#18181A] text-white rounded-t-[38px] sm:rounded-[40px] shadow-[0_25px_90px_rgba(0,0,0,0.9)] border border-white/10 overflow-hidden flex flex-col min-h-[640px] max-h-[94vh] relative transition-transform duration-200 ${closing ? 'translate-y-12' : 'translate-y-0'}`}>
        
        {/* Top Leaflet CARTO Map Section */}
        <div className="relative flex-1 bg-[#edf2f7] min-h-[300px] overflow-hidden">
          <div ref={mapContainerRef} className="w-full h-full min-h-[300px] z-0" />

          {/* Floating Back Pill Button */}
          <div className="absolute top-5 left-5 z-[500] flex items-center gap-2">
            <button
              onClick={handleAnimatedClose}
              className="px-4 py-2 rounded-full bg-[#18181A]/90 hover:bg-[#18181A] text-white text-xs font-bold shadow-xl flex items-center gap-1.5 backdrop-blur-md border border-white/10 active:scale-95 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>

          {/* Floating Re-center Button */}
          <div className="absolute top-5 right-5 z-[500]">
            <button
              onClick={handleRecenter}
              className="w-10 h-10 rounded-full bg-[#18181A]/90 hover:bg-[#18181A] text-white shadow-xl flex items-center justify-center backdrop-blur-md border border-white/10 active:scale-95 transition-all cursor-pointer"
              title="Re-center route"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom Curved Dark Sheet Card (Exact Layout From Screenshot) */}
        <div className="bg-[#18181A] rounded-t-[36px] p-6 -mt-6 relative z-30 shadow-[0_-15px_40px_rgba(0,0,0,0.5)] border-t border-white/5 space-y-6">
          
          {/* 1. Header: Estimated Time */}
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-black text-white font-['Outfit'] tracking-tight">
              Estimated delivery time is {getEstimatedTime()}
            </h3>
            <p className="text-xs text-zinc-400 font-medium">
              {getStatusText()}
            </p>
          </div>

          {/* 2. Horizontal Progress Icon Step Tracker with Dotted Lines */}
          <div className="flex items-center justify-between px-2 pt-1">
            {/* Step 1: Receipt / Order Placed */}
            <div className="flex items-center justify-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                isStep1 ? 'text-[#E0FF33]' : 'text-zinc-600'
              }`}>
                <Receipt className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>

            {/* Dotted Line */}
            <div className="flex-1 flex justify-center items-center px-1 overflow-hidden">
              <span className={`tracking-[3px] text-xs font-black select-none ${
                isStep2 ? 'text-[#E0FF33]' : 'text-zinc-600'
              }`}>
                ••••••••
              </span>
            </div>

            {/* Step 2: Cooking Bowl / Hot Pot */}
            <div className="flex items-center justify-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                isStep2 ? 'text-[#E0FF33]' : 'text-zinc-600'
              }`}>
                <Soup className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>

            {/* Dotted Line */}
            <div className="flex-1 flex justify-center items-center px-1 overflow-hidden">
              <span className={`tracking-[3px] text-xs font-black select-none ${
                isStep3 ? 'text-[#E0FF33]' : 'text-zinc-600'
              }`}>
                ••••••••
              </span>
            </div>

            {/* Step 3: Courier Bike / Scooter */}
            <div className="flex items-center justify-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                isStep3 ? 'text-[#E0FF33] animate-pulse' : 'text-zinc-600'
              }`}>
                <Bike className="w-7 h-7 stroke-[2.2]" />
              </div>
            </div>

            {/* Dotted Line */}
            <div className="flex-1 flex justify-center items-center px-1 overflow-hidden">
              <span className={`tracking-[3px] text-xs font-black select-none ${
                isStep4 ? 'text-[#E0FF33]' : 'text-zinc-600'
              }`}>
                ••••••••
              </span>
            </div>

            {/* Step 4: Checkmark Completed */}
            <div className="flex items-center justify-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                isStep4 ? 'text-[#E0FF33]' : 'text-zinc-600'
              }`}>
                <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>
          </div>

          {/* 3. Courier Profile Bar (Exact Design From Screenshot) */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-13 h-13 rounded-full overflow-hidden border border-white/15 bg-zinc-800 shrink-0 shadow-md">
                <img 
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" 
                  alt="Courier Profile" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h4 className="font-black text-white text-base font-['Outfit'] tracking-tight">
                  {order?.createdBy || 'Sarathi Courier'}
                </h4>
                <p className="text-xs text-zinc-400 font-medium">Courier</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Phone Call Pill */}
              <a 
                href={`tel:${order?.customerPhone || '9876543210'}`}
                className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:bg-zinc-100 active:scale-95 transition-all"
                title="Call Courier"
              >
                <Phone className="w-5 h-5 fill-black" />
              </a>

              {/* Chat Message Pill with Live Online Green Dot */}
              <button 
                onClick={() => alert(`Connecting with ${order?.createdBy || 'Sarathi Courier'} via live dispatch chat.`)}
                className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:bg-zinc-100 relative active:scale-95 transition-all"
                title="Message Courier"
              >
                <MessageCircle className="w-5 h-5 fill-black" />
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#E0FF33] ring-2 ring-white" />
              </button>
            </div>
          </div>

          {/* Order Dishes Collapsible Drawer */}
          <div className="bg-[#242021] rounded-2xl p-3 border border-white/5 text-xs">
            <button 
              onClick={() => setShowItems(!showItems)}
              className="w-full flex items-center justify-between text-zinc-300 font-bold"
            >
              <span>Order #{order?.id?.slice(-6).toUpperCase()} Details ({order?.items?.length || 0} items)</span>
              {showItems ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showItems && (
              <div className="mt-2.5 space-y-1.5 pt-2 border-t border-white/5 text-zinc-400">
                {order?.items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[11px]">
                    <span className="text-white font-medium">{it.name} × {it.quantity}</span>
                    <span className="font-bold text-[#E0FF33]">₹{it.price * it.quantity}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-white/5 flex justify-between font-black text-white text-xs">
                  <span>Total Paid</span>
                  <span className="text-[#E0FF33]">₹{order?.totalAmount}</span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
