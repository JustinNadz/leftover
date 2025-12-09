// App.js — LeftUber MVP with Backend Integration
// Full-stack version with real API calls

import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  Image,
  StyleSheet,
  Alert,
  Platform,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import {
  authApi,
  productsApi,
  ordersApi,
  setAuthToken,
  clearAuthToken,
} from './services/api';

const PURPLE = '#5b2b8c';
const ORANGE = '#ff9500';
const DELIVERY_FEE = 30;
const { width: WINDOW_WIDTH } = Dimensions.get('window');

// Hosted images
const HEADER_ICON = {
  uri: 'https://i.ibb.co/TD9zHnZn/553441880-612851101795952-708089195609030109-n.jpg',
};
const LOGIN_BANNER = {
  uri: 'https://i.ibb.co/3yMBqGCD/557583863-2138933880225605-1487155718323992417-n.jpg',
};

// Ad images
const ADS = [
  {
    id: 'a1',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
    title: '50% off at Speedy Burger',
  },
  {
    id: 'a2',
    image: 'https://images.unsplash.com/photo-1512058564366-c9e0b8da9b4a?auto=format&fit=crop&w=1200&q=80',
    title: 'Fresh Fruits Promo',
  },
  {
    id: 'a3',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
    title: 'Donut Happy Hour',
  },
];

const CATEGORIES = ['All', 'Fast Food', 'Vegetables', 'Fruits', 'Drinks', 'Donuts'];

export default function App() {
  // --- Auth & profile ---
  const [screen, setScreen] = useState('login'); // login | otp | roleSelect | main
  const [phone, setPhone] = useState('');
  const [otpFromServer, setOtpFromServer] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [user, setUser] = useState(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- App state ---
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [category, setCategory] = useState('All');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // modals & forms
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [postForm, setPostForm] = useState({
    title: '',
    description: '',
    image: '',
    originalPrice: '',
    offerPrice: '',
    quantity: '',
    category: 'Fast Food',
    merchant: '',
    pickupTime: '',
  });

  // order flow
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderForm, setOrderForm] = useState({
    deliveryType: 'PICKUP',
    addressText: '',
    coords: null,
    dateObj: new Date(),
    timeObj: new Date(),
    note: '',
  });

  // map picker
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 14.599512,
    longitude: 120.984222,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [markerCoord, setMarkerCoord] = useState({
    latitude: 14.599512,
    longitude: 120.984222,
  });

  // ads carousel
  const [adIndex, setAdIndex] = useState(0);
  const adIntervalRef = useRef(null);

  // date/time pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Role selection
  const [selectedRole, setSelectedRole] = useState('BUYER');
  const [userName, setUserName] = useState('');

  // Start ads auto-slide
  useEffect(() => {
    adIntervalRef.current = setInterval(() => {
      setAdIndex((i) => (i + 1) % ADS.length);
    }, 3500);
    return () => clearInterval(adIntervalRef.current);
  }, []);

  // Fetch products when category changes
  useEffect(() => {
    if (screen === 'main') {
      fetchProducts();
    }
  }, [category, screen]);

  // Fetch orders when on Orders tab
  useEffect(() => {
    if (screen === 'main' && activeTab === 'Orders') {
      fetchOrders();
    }
  }, [activeTab, screen]);

  // ---------- API CALLS ----------
  const fetchProducts = async () => {
    try {
      const filters = category !== 'All' ? { category } : {};
      const data = await productsApi.getAll(filters);
      setProducts(data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const data = await ordersApi.getAll();
      setOrders(data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const fetchMyProducts = async () => {
    try {
      const data = await productsApi.getMy();
      return data;
    } catch (error) {
      console.error('Failed to fetch my products:', error);
      return [];
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  };

  // ---------- AUTH / OTP ----------
  const sendOtp = async () => {
    if (!phone || phone.trim().length < 7) {
      Alert.alert('Enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.sendOtp(phone.trim());
      if (response.success) {
        setOtpFromServer(response.otp); // For testing only
        setScreen('otp');
        Alert.alert('OTP Sent', `Your OTP is: ${response.otp}`);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otpInput || otpInput.length !== 4) {
      Alert.alert('Enter a valid 4-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.verifyOtp(phone.trim(), otpInput);
      if (response.success) {
        setAuthToken(response.token);
        setUser(response.user);
        setIsNewUser(response.isNewUser);

        if (response.isNewUser) {
          setScreen('roleSelect');
        } else {
          setScreen('main');
          setActiveTab('Dashboard');
          fetchProducts();
        }
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const completeRegistration = async () => {
    if (!userName.trim()) {
      Alert.alert('Enter your name');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.updateRole(selectedRole, userName.trim());
      if (response.success) {
        setAuthToken(response.token);
        setUser(response.user);
        setScreen('main');
        setActiveTab('Dashboard');
        fetchProducts();
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to complete registration');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearAuthToken();
    setUser(null);
    setScreen('login');
    setPhone('');
    setOtpInput('');
    setOtpFromServer('');
    setProducts([]);
    setOrders([]);
  };

  // ---------- PRODUCTS ----------
  const openDetails = (product) => {
    Alert.alert(
      product.title,
      `${product.description}\n\nPrice: ₱${product.offerPrice}\nQty: ${product.quantity}\nViews: ${product.views || 0}`
    );
  };

  const openOrder = (product) => {
    setSelectedProduct(product);
    setOrderForm({
      deliveryType: 'PICKUP',
      addressText: '',
      coords: null,
      dateObj: new Date(),
      timeObj: new Date(),
      note: '',
    });
    setOrderModalVisible(true);
  };

  const confirmOrder = async () => {
    if (!selectedProduct) return;

    if (selectedProduct.quantity <= 0) {
      Alert.alert('Sold out', 'This product is no longer available.');
      setOrderModalVisible(false);
      return;
    }

    if (orderForm.deliveryType === 'DELIVERY' && !orderForm.addressText && !orderForm.coords) {
      Alert.alert('Address required', 'Please enter an address or pick a location on the map.');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        productId: selectedProduct.id,
        deliveryType: orderForm.deliveryType,
        addressText: orderForm.addressText,
        latitude: orderForm.coords?.latitude,
        longitude: orderForm.coords?.longitude,
        scheduledDate: orderForm.dateObj.toISOString().slice(0, 10),
        scheduledTime: orderForm.timeObj.toTimeString().slice(0, 5),
        note: orderForm.note,
      };

      const order = await ordersApi.create(orderData);

      setOrderModalVisible(false);
      Alert.alert('Order placed', `Your order for ${selectedProduct.title} was placed.\nTotal: ₱${order.total}`);

      // Refresh products to update stock
      fetchProducts();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  // ---------- POST SURPLUS ----------
  const publishPost = async () => {
    if (!postForm.title || !postForm.offerPrice || !postForm.quantity) {
      Alert.alert('Missing fields', 'Please fill Title, Offer Price, and Quantity.');
      return;
    }

    setLoading(true);
    try {
      await productsApi.create({
        title: postForm.title,
        description: postForm.description,
        image: postForm.image,
        category: postForm.category,
        originalPrice: postForm.originalPrice,
        offerPrice: postForm.offerPrice,
        quantity: postForm.quantity,
        pickupTime: postForm.pickupTime,
      });

      setPostModalVisible(false);
      setPostForm({
        title: '',
        description: '',
        image: '',
        originalPrice: '',
        offerPrice: '',
        quantity: '',
        category: 'Fast Food',
        merchant: '',
        pickupTime: '',
      });
      Alert.alert('Posted', 'Your surplus item has been added to the dashboard.');
      fetchProducts();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to post item');
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (productId) => {
    try {
      await productsApi.delete(productId);
      Alert.alert('Deleted', 'Product removed successfully.');
      fetchProducts();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to delete product');
    }
  };

  // ---------- ORDERS (Merchant) ----------
  const updateOrderStatus = async (orderId, status) => {
    try {
      await ordersApi.updateStatus(orderId, status);
      Alert.alert('Updated', `Order status changed to ${status}`);
      fetchOrders();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update order');
    }
  };

  // ---------- MAP PICKER ----------
  const openMapPicker = () => {
    if (orderForm.coords) {
      setMarkerCoord(orderForm.coords);
      setMapRegion((r) => ({
        ...r,
        latitude: orderForm.coords.latitude,
        longitude: orderForm.coords.longitude,
      }));
    }
    setMapPickerVisible(true);
  };

  const confirmMapLocation = () => {
    setOrderForm((f) => ({
      ...f,
      coords: markerCoord,
      addressText: `Location: ${markerCoord.latitude.toFixed(5)}, ${markerCoord.longitude.toFixed(5)}`,
    }));
    setMapPickerVisible(false);
  };

  // ---------- DATE & TIME PICKERS ----------
  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setOrderForm((f) => ({ ...f, dateObj: selectedDate }));
  };

  const onChangeTime = (event, selectedTime) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) setOrderForm((f) => ({ ...f, timeObj: selectedTime }));
  };

  const formatDate = (d) => {
    if (!d) return '';
    const opt = { month: 'short', day: 'numeric', year: 'numeric' };
    try {
      return new Date(d).toLocaleDateString(undefined, opt);
    } catch {
      return d.toString();
    }
  };

  const formatTime = (t) => {
    if (!t) return '';
    try {
      const dt = new Date(t);
      return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return t.toString();
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return '#ff9500';
      case 'CONFIRMED': return '#007aff';
      case 'COMPLETED': return '#34c759';
      case 'CANCELLED': return '#ff3b30';
      default: return '#666';
    }
  };

  // ---------- UI RENDER ----------

  // LOGIN SCREEN
  if (screen === 'login') {
    return (
      <LinearGradient colors={[PURPLE, ORANGE]} style={styles.gradient}>
        <SafeAreaView style={styles.loginSafe}>
          <Image source={LOGIN_BANNER} style={styles.loginBanner} />
          <Text style={styles.loginHint}>Surplus food. Fair prices. Save food.</Text>

          <View style={styles.loginForm}>
            <TextInput
              placeholder="Phone number"
              placeholderTextColor="#eee"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              style={styles.loginInput}
            />
            <TouchableOpacity
              onPress={sendOtp}
              disabled={loading}
              style={styles.loginBtn}>
              {loading ? (
                <ActivityIndicator color={PURPLE} />
              ) : (
                <Text style={{ color: PURPLE, fontWeight: '700' }}>Send OTP</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.guestBtn}
              onPress={() => {
                setUser({ name: 'Guest', role: 'BUYER', phone: 'guest' });
                setScreen('main');
              }}>
              <Text style={{ color: '#fff' }}>Continue as Guest</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // OTP SCREEN
  if (screen === 'otp') {
    return (
      <SafeAreaView style={styles.otpSafe}>
        <Image source={LOGIN_BANNER} style={styles.loginBannerSmall} />
        <Text style={{ color: PURPLE, textAlign: 'center', marginBottom: 8 }}>
          Enter the 4-digit OTP
        </Text>

        <View style={{ paddingHorizontal: 24 }}>
          <Text style={{ marginBottom: 6, color: '#444' }}>OTP sent to {phone}</Text>
          <TextInput
            placeholder="1234"
            keyboardType="number-pad"
            value={otpInput}
            onChangeText={setOtpInput}
            style={styles.input}
            maxLength={4}
          />
          <TouchableOpacity
            onPress={verifyOtp}
            disabled={loading}
            style={styles.orangeBtn}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: '700' }}>Verify</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={{ marginTop: 12 }} onPress={sendOtp}>
            <Text style={{ color: PURPLE, textAlign: 'center' }}>Resend OTP</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ROLE SELECTION SCREEN (New users)
  if (screen === 'roleSelect') {
    return (
      <SafeAreaView style={styles.otpSafe}>
        <Image source={LOGIN_BANNER} style={styles.loginBannerSmall} />
        <Text style={{ fontSize: 20, fontWeight: '800', color: PURPLE, textAlign: 'center', marginBottom: 16 }}>
          Complete Your Profile
        </Text>

        <View style={{ paddingHorizontal: 24 }}>
          <Text style={{ marginBottom: 6, color: '#444' }}>Your Name</Text>
          <TextInput
            placeholder="Enter your name"
            value={userName}
            onChangeText={setUserName}
            style={styles.input}
          />

          <Text style={{ marginBottom: 6, marginTop: 12, color: '#444' }}>I am a...</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={() => setSelectedRole('BUYER')}
              style={[
                styles.roleBtn,
                selectedRole === 'BUYER' && styles.roleBtnActive,
              ]}>
              <Text style={{ fontSize: 24 }}>🛒</Text>
              <Text style={{ fontWeight: '700', color: selectedRole === 'BUYER' ? '#fff' : PURPLE }}>
                Buyer
              </Text>
              <Text style={{ fontSize: 12, color: selectedRole === 'BUYER' ? '#fff' : '#666' }}>
                I want to buy surplus food
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSelectedRole('MERCHANT')}
              style={[
                styles.roleBtn,
                selectedRole === 'MERCHANT' && styles.roleBtnActive,
              ]}>
              <Text style={{ fontSize: 24 }}>🏪</Text>
              <Text style={{ fontWeight: '700', color: selectedRole === 'MERCHANT' ? '#fff' : PURPLE }}>
                Merchant
              </Text>
              <Text style={{ fontSize: 12, color: selectedRole === 'MERCHANT' ? '#fff' : '#666' }}>
                I want to sell surplus food
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={completeRegistration}
            disabled={loading}
            style={[styles.orangeBtn, { marginTop: 24 }]}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: '700' }}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // MAIN APP
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={HEADER_ICON} style={styles.headerIcon} />
          <View>
            <Text style={styles.headerTitle}>LeftUber</Text>
            <Text style={styles.headerSubtitle}>
              {user?.role === 'MERCHANT' ? '🏪 Merchant' : '🛒 Buyer'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setActiveTab('Dashboard')} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('Profile')} style={styles.headerBtnAlt}>
            <Text style={styles.headerBtnText}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'Dashboard' && (
          <View style={{ flex: 1 }}>
            {/* Ads carousel */}
            <View style={styles.adsContainer}>
              <Image source={{ uri: ADS[adIndex].image }} style={styles.adImage} />
              <View style={styles.adOverlay}>
                <Text style={styles.adTitle}>{ADS[adIndex].title}</Text>
              </View>
            </View>

            {/* Category pills */}
            <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setCategory(c)}
                    style={[
                      styles.categoryPill,
                      category === c && styles.categoryPillActive,
                    ]}>
                    <Text style={{ color: category === c ? '#fff' : PURPLE, fontWeight: '700' }}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Top actions */}
            <View style={styles.topActions}>
              <Text style={{ fontWeight: '800', color: PURPLE }}>Available Offers</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {user?.role === 'MERCHANT' && (
                  <TouchableOpacity style={styles.ghostBtn} onPress={() => setPostModalVisible(true)}>
                    <Text style={{ color: PURPLE }}>+ Post Surplus</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.ghostBtn} onPress={fetchProducts}>
                  <Text style={{ color: PURPLE }}>↻ Refresh</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Product list */}
            <FlatList
              data={products}
              keyExtractor={(i) => i.id}
              contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PURPLE]} />
              }
              renderItem={({ item }) => (
                <View style={styles.productCard}>
                  <Image source={{ uri: item.image }} style={styles.productImage} />
                  <View style={{ flex: 1, padding: 12 }}>
                    <View style={styles.productHeader}>
                      <Text style={styles.productTitle}>{item.title}</Text>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {item.hot && (
                          <View style={styles.hotBadge}>
                            <Text style={{ fontWeight: '800', color: '#000' }}>🔥 Hot</Text>
                          </View>
                        )}
                        {item.bestSeller && (
                          <View style={styles.bestBadge}>
                            <Text style={{ fontWeight: '800', color: '#000' }}>⭐ Best</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <Text style={{ color: '#666', marginTop: 4 }}>
                      {item.merchant?.name || 'Unknown'} • {item.pickupTime}
                    </Text>
                    <Text numberOfLines={2} style={{ color: '#444', marginTop: 6 }}>
                      {item.description}
                    </Text>

                    <View style={styles.priceRow}>
                      {item.originalPrice && (
                        <Text style={styles.originalPrice}>₱{item.originalPrice}</Text>
                      )}
                      <Text style={styles.offerPrice}>₱{item.offerPrice}</Text>
                      <Text style={{ marginLeft: 'auto', color: '#666' }}>Qty: {item.quantity}</Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                      <TouchableOpacity onPress={() => openOrder(item)} style={styles.orderBtn}>
                        <Text style={{ color: '#fff', fontWeight: '700' }}>Order</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => openDetails(item)} style={styles.detailsBtn}>
                        <Text style={{ color: ORANGE }}>Details</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: '#666' }}>No items in this category.</Text>
                </View>
              }
            />
          </View>
        )}

        {activeTab === 'MyListings' && (
          <MyListingsTab
            user={user}
            fetchMyProducts={fetchMyProducts}
            deleteProduct={deleteProduct}
            setPostModalVisible={setPostModalVisible}
          />
        )}

        {activeTab === 'Orders' && (
          <OrdersTab
            orders={orders}
            user={user}
            updateOrderStatus={updateOrderStatus}
            getStatusColor={getStatusColor}
            onRefresh={fetchOrders}
          />
        )}

        {activeTab === 'Profile' && (
          <ProfileTab user={user} setUser={setUser} logout={logout} />
        )}
      </View>

      {/* Bottom Tabs */}
      <View style={styles.bottomTabs}>
        <TouchableOpacity onPress={() => setActiveTab('Dashboard')} style={styles.tabItem}>
          <Text style={{ color: activeTab === 'Dashboard' ? PURPLE : '#666', fontWeight: '700' }}>
            Dashboard
          </Text>
        </TouchableOpacity>

        {user?.role === 'MERCHANT' && (
          <TouchableOpacity onPress={() => setActiveTab('MyListings')} style={styles.tabItem}>
            <Text style={{ color: activeTab === 'MyListings' ? PURPLE : '#666', fontWeight: '700' }}>
              My Listings
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => setActiveTab('Orders')} style={styles.tabItem}>
          <Text style={{ color: activeTab === 'Orders' ? PURPLE : '#666', fontWeight: '700' }}>
            Orders ({orders.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setActiveTab('Profile')} style={styles.tabItem}>
          <Text style={{ color: activeTab === 'Profile' ? PURPLE : '#666', fontWeight: '700' }}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>

      {/* Post Surplus Modal */}
      <Modal visible={postModalVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: PURPLE }}>Post Surplus Item</Text>

            <TextInput
              placeholder="Title"
              value={postForm.title}
              onChangeText={(t) => setPostForm((f) => ({ ...f, title: t }))}
              style={styles.input}
            />
            <TextInput
              placeholder="Description"
              value={postForm.description}
              onChangeText={(t) => setPostForm((f) => ({ ...f, description: t }))}
              style={[styles.input, { height: 80 }]}
              multiline
            />
            <TextInput
              placeholder="Image URL (optional)"
              value={postForm.image}
              onChangeText={(t) => setPostForm((f) => ({ ...f, image: t }))}
              style={styles.input}
            />
            <TextInput
              placeholder="Original Price"
              value={postForm.originalPrice}
              onChangeText={(t) => setPostForm((f) => ({ ...f, originalPrice: t }))}
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              placeholder="Offer Price *"
              value={postForm.offerPrice}
              onChangeText={(t) => setPostForm((f) => ({ ...f, offerPrice: t }))}
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              placeholder="Quantity *"
              value={postForm.quantity}
              onChangeText={(t) => setPostForm((f) => ({ ...f, quantity: t }))}
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              placeholder="Pickup time (e.g., Today, 5:00 PM)"
              value={postForm.pickupTime}
              onChangeText={(t) => setPostForm((f) => ({ ...f, pickupTime: t }))}
              style={styles.input}
            />

            <View style={{ marginTop: 8 }}>
              <Text style={{ marginBottom: 6, fontWeight: '700' }}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {CATEGORIES.slice(1).map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setPostForm((f) => ({ ...f, category: c }))}
                    style={[
                      styles.categoryPill,
                      postForm.category === c && styles.categoryPillActive,
                    ]}>
                    <Text style={{ color: postForm.category === c ? '#fff' : PURPLE, fontWeight: '700' }}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <TouchableOpacity onPress={publishPost} disabled={loading} style={[styles.purpleBtn, { flex: 1 }]}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Publish</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPostModalVisible(false)} style={[styles.cancelBtn, { flex: 1 }]}>
                <Text style={{ color: '#333' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Order Modal */}
      <Modal visible={orderModalVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: PURPLE }}>
              {selectedProduct ? `Order: ${selectedProduct.title}` : 'Order'}
            </Text>
            <Text style={{ marginTop: 8, color: '#666' }}>
              Merchant: {selectedProduct?.merchant?.name || 'Unknown'}
            </Text>

            <View style={{ marginTop: 12 }}>
              <Text style={{ fontWeight: '700', marginBottom: 6 }}>Delivery type</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['PICKUP', 'DELIVERY'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setOrderForm((f) => ({ ...f, deliveryType: t }))}
                    style={[
                      styles.categoryPill,
                      orderForm.deliveryType === t && styles.categoryPillActive,
                    ]}>
                    <Text style={{ color: orderForm.deliveryType === t ? '#fff' : PURPLE }}>
                      {t === 'PICKUP' ? 'Pickup' : 'Delivery'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {orderForm.deliveryType === 'DELIVERY' && (
                <>
                  <Text style={{ marginTop: 12, fontWeight: '700' }}>Delivery address</Text>
                  <TextInput
                    placeholder="Type address (or pick location on map)"
                    value={orderForm.addressText}
                    onChangeText={(t) => setOrderForm((f) => ({ ...f, addressText: t }))}
                    style={styles.input}
                  />
                  <TouchableOpacity onPress={openMapPicker} style={styles.orangeBtn}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>📍 Pick on map</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Date & Time */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ marginTop: 8, fontWeight: '700' }}>Date</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
                    <Text>{formatDate(orderForm.dateObj)}</Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={orderForm.dateObj}
                      mode="date"
                      display="default"
                      onChange={onChangeDate}
                      minimumDate={new Date()}
                    />
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ marginTop: 8, fontWeight: '700' }}>Time</Text>
                  <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.input}>
                    <Text>{formatTime(orderForm.timeObj)}</Text>
                  </TouchableOpacity>
                  {showTimePicker && (
                    <DateTimePicker
                      value={orderForm.timeObj}
                      mode="time"
                      display="default"
                      onChange={onChangeTime}
                      minuteInterval={5}
                    />
                  )}
                </View>
              </View>

              <Text style={{ marginTop: 8, fontWeight: '700' }}>Note (optional)</Text>
              <TextInput
                placeholder="Leave a note for merchant or rider"
                value={orderForm.note}
                onChangeText={(t) => setOrderForm((f) => ({ ...f, note: t }))}
                style={[styles.input, { height: 80 }]}
                multiline
              />

              {/* Pricing summary */}
              <View style={styles.orderSummary}>
                <Text style={{ fontWeight: '700' }}>Order summary</Text>
                <Text style={{ marginTop: 8 }}>
                  Item: {selectedProduct?.title} — ₱{selectedProduct?.offerPrice}
                </Text>
                <Text>Delivery fee: ₱{DELIVERY_FEE}</Text>
                <Text style={{ marginTop: 8, fontWeight: '800' }}>
                  Total: ₱{(selectedProduct?.offerPrice || 0) + DELIVERY_FEE}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                <TouchableOpacity onPress={confirmOrder} disabled={loading} style={[styles.purpleBtn, { flex: 1 }]}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '700' }}>
                      Confirm — ₱{(selectedProduct?.offerPrice || 0) + DELIVERY_FEE}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setOrderModalVisible(false)} style={styles.cancelBtn}>
                  <Text style={{ color: '#333' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Map Picker Modal */}
      <Modal visible={mapPickerVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1 }}>
            <MapView
              style={{ flex: 1 }}
              initialRegion={mapRegion}
              region={mapRegion}
              onPress={(e) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                setMarkerCoord({ latitude, longitude });
                setMapRegion((r) => ({ ...r, latitude, longitude }));
              }}
              onRegionChangeComplete={(r) => setMapRegion(r)}>
              <Marker
                coordinate={markerCoord}
                draggable
                onDragEnd={(e) => setMarkerCoord(e.nativeEvent.coordinate)}
              />
            </MapView>

            <View style={{ padding: 12, backgroundColor: '#fff' }}>
              <Text style={{ fontWeight: '700', marginBottom: 6 }}>Selected location</Text>
              <Text style={{ color: '#444', marginBottom: 6 }}>
                {markerCoord.latitude.toFixed(5)}, {markerCoord.longitude.toFixed(5)}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={confirmMapLocation} style={[styles.orangeBtn, { flex: 1 }]}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Use this location</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setMapPickerVisible(false)} style={[styles.cancelBtn, { flex: 1 }]}>
                  <Text style={{ color: '#333' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ---------- SUB COMPONENTS ----------

function MyListingsTab({ user, fetchMyProducts, deleteProduct, setPostModalVisible }) {
  const [myProducts, setMyProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    const data = await fetchMyProducts();
    setMyProducts(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontWeight: '800', fontSize: 18, color: PURPLE }}>My Listings</Text>
        <TouchableOpacity onPress={() => setPostModalVisible(true)} style={styles.ghostBtn}>
          <Text style={{ color: PURPLE }}>+ Add New</Text>
        </TouchableOpacity>
      </View>

      {myProducts.length === 0 ? (
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Text style={{ color: '#666' }}>You have not posted any items yet.</Text>
        </View>
      ) : (
        myProducts.map((item) => (
          <View key={item.id} style={styles.productCard}>
            <Image source={{ uri: item.image }} style={{ width: 120, height: 120 }} />
            <View style={{ flex: 1, padding: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: PURPLE }}>{item.title}</Text>
              <Text style={{ color: '#666', marginTop: 4 }}>{item.pickupTime}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <Text style={{ color: '#666' }}>Views: {item.views || 0} | Sales: {item.salesCount || 0}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert('Delete', 'Remove this item?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => deleteProduct(item.id) },
                    ]);
                  }}
                  style={styles.deleteBtn}>
                  <Text style={{ color: '#ff3b30' }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function OrdersTab({ orders, user, updateOrderStatus, getStatusColor, onRefresh }) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[PURPLE]} />
        }
        renderItem={({ item }) => (
          <View style={styles.orderCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontWeight: '800' }}>{item.product?.title}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{item.status}</Text>
              </View>
            </View>
            <Text style={{ color: '#666', marginTop: 6 }}>
              {user?.role === 'MERCHANT' ? `Buyer: ${item.buyer?.name}` : `Merchant: ${item.merchant?.name}`}
              {' • '}{item.deliveryType}
            </Text>
            <Text style={{ color: '#444', marginTop: 6 }}>
              {item.scheduledDate} {item.scheduledTime} • {item.addressText || 'Pickup at merchant'}
            </Text>
            <Text style={{ marginTop: 6, fontWeight: '700' }}>Total: ₱{item.total}</Text>

            {/* Merchant actions */}
            {user?.role === 'MERCHANT' && item.status !== 'COMPLETED' && item.status !== 'CANCELLED' && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                {item.status === 'PENDING' && (
                  <TouchableOpacity
                    onPress={() => updateOrderStatus(item.id, 'CONFIRMED')}
                    style={styles.confirmBtn}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>✓ Confirm</Text>
                  </TouchableOpacity>
                )}
                {item.status === 'CONFIRMED' && (
                  <TouchableOpacity
                    onPress={() => updateOrderStatus(item.id, 'COMPLETED')}
                    style={styles.completeBtn}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>✓ Complete</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert('Cancel Order', 'Are you sure?', [
                      { text: 'No', style: 'cancel' },
                      { text: 'Yes', onPress: () => updateOrderStatus(item.id, 'CANCELLED') },
                    ]);
                  }}
                  style={styles.cancelOrderBtn}>
                  <Text style={{ color: '#ff3b30' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ color: '#666' }}>No orders yet.</Text>
          </View>
        }
      />
    </View>
  );
}

function ProfileTab({ user, setUser, logout }) {
  const [name, setName] = useState(user?.name || '');

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: PURPLE }}>Profile Center</Text>
      <Text style={{ color: '#666', marginTop: 8 }}>
        Role: {user?.role === 'MERCHANT' ? '🏪 Merchant' : '🛒 Buyer'}
      </Text>
      <Text style={{ color: '#666', marginTop: 4 }}>Phone: {user?.phone}</Text>

      <TextInput
        placeholder="Full name"
        value={name}
        onChangeText={setName}
        style={[styles.input, { marginTop: 16 }]}
      />

      <TouchableOpacity
        onPress={() => {
          if (!name) {
            Alert.alert('Please enter name');
            return;
          }
          setUser((u) => ({ ...u, name }));
          Alert.alert('Saved', 'Profile details saved.');
        }}
        style={styles.purpleBtn}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>Save Profile</Text>
      </TouchableOpacity>

      <View style={{ height: 18 }} />

      <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
        <Text style={{ color: '#333', fontWeight: '700' }}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ---------- STYLES ----------
const styles = StyleSheet.create({
  gradient: { flex: 1 },
  loginSafe: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loginBanner: { width: 300, height: 120, resizeMode: 'contain', marginBottom: 6 },
  loginBannerSmall: { width: 260, height: 100, resizeMode: 'contain', alignSelf: 'center', marginBottom: 12 },
  loginHint: { color: '#fff', opacity: 0.95, marginBottom: 12 },
  loginForm: { paddingHorizontal: 24, marginTop: 8, width: '100%', alignItems: 'center' },
  loginInput: { backgroundColor: '#ffffffaa', padding: 12, borderRadius: 8, width: '90%', marginBottom: 12, color: '#000' },
  loginBtn: { backgroundColor: '#fff', padding: 12, borderRadius: 8, alignItems: 'center', width: '90%' },
  guestBtn: { marginTop: 12, padding: 10, borderRadius: 8, alignItems: 'center', backgroundColor: '#ffffff33', width: '90%' },
  otpSafe: { flex: 1, justifyContent: 'center' },
  container: { flex: 1, backgroundColor: '#f6f6fb' },

  header: { height: 64, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: PURPLE },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIcon: { width: 44, height: 44, resizeMode: 'contain' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: 12, color: '#fff', opacity: 0.8 },
  headerRight: { flexDirection: 'row', gap: 8 },
  headerBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: ORANGE, alignItems: 'center' },
  headerBtnAlt: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#ffffff22', alignItems: 'center' },
  headerBtnText: { color: '#fff', fontWeight: '700' },

  adsContainer: { height: 150, margin: 12, borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee' },
  adImage: { width: '100%', height: '100%' },
  adOverlay: { position: 'absolute', left: 12, bottom: 12, backgroundColor: '#00000066', padding: 8, borderRadius: 8 },
  adTitle: { color: '#fff', fontWeight: '800' },

  categoryPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8, backgroundColor: '#fff', borderColor: PURPLE },
  categoryPillActive: { backgroundColor: PURPLE },

  topActions: { paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ghostBtn: { borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: PURPLE, backgroundColor: '#fff' },

  productCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, flexDirection: 'row', overflow: 'hidden', borderWidth: 1, borderColor: PURPLE },
  productImage: { width: 120, height: 120 },
  productHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productTitle: { fontSize: 16, fontWeight: '800', color: PURPLE, flex: 1 },
  hotBadge: { backgroundColor: '#ff4d4d', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  bestBadge: { backgroundColor: '#ffd100', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  originalPrice: { textDecorationLine: 'line-through', color: '#888', marginRight: 8 },
  offerPrice: { fontWeight: '900', fontSize: 16, color: ORANGE, marginRight: 8 },
  orderBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: PURPLE },
  detailsBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: ORANGE },

  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12, marginBottom: 10 },
  purpleBtn: { backgroundColor: PURPLE, padding: 12, borderRadius: 8, alignItems: 'center' },
  orangeBtn: { backgroundColor: ORANGE, padding: 12, borderRadius: 8, alignItems: 'center' },
  cancelBtn: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8, alignItems: 'center' },
  logoutBtn: { backgroundColor: '#ddd', padding: 12, borderRadius: 8, alignItems: 'center' },
  deleteBtn: { padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#ff3b30' },

  orderSummary: { marginTop: 12, padding: 12, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#eee' },
  orderCard: { backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#eee' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  confirmBtn: { backgroundColor: '#007aff', padding: 10, borderRadius: 8, flex: 1, alignItems: 'center' },
  completeBtn: { backgroundColor: '#34c759', padding: 10, borderRadius: 8, flex: 1, alignItems: 'center' },
  cancelOrderBtn: { borderWidth: 1, borderColor: '#ff3b30', padding: 10, borderRadius: 8, alignItems: 'center' },

  roleBtn: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 2, borderColor: PURPLE, alignItems: 'center', backgroundColor: '#fff' },
  roleBtnActive: { backgroundColor: PURPLE, borderColor: PURPLE },

  bottomTabs: { height: 64, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  tabItem: { alignItems: 'center', justifyContent: 'center' },
});
