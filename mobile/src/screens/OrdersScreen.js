import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';

import { fetchMyOrders } from '../services/orders';

export default function OrdersScreen({ navigation }) {
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);

  async function load() {
    try {
      setError(null);
      setLoading(true);
      const data = await fetchMyOrders();
      // Backend might return { orders: [...] } or just [...]
      setOrders(data?.orders || data || []);
    } catch (e) {
      setError(e?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isFocused) load();
  }, [isFocused]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, padding: 16 }}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      {error ? (
        <Text style={{ color: 'crimson', marginBottom: 10 }}>{error}</Text>
      ) : null}

      <FlatList
        data={orders}
        keyExtractor={(item) => String(item?._id || item?.id)}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          const id = item?._id || item?.id;
          return (
            <Pressable
              onPress={() => navigation.navigate('OrderDetails', { orderId: id })}
              style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
            >
              <Text style={{ fontWeight: '600' }}>Order #{String(id).slice(-6)}</Text>
              {!!item?.status && <Text>Status: {item.status}</Text>}
              {!!item?.total && <Text>Total: {item.total}</Text>}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}
