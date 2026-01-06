import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  SafeAreaView,
  Text,
  View,
} from 'react-native';

import { fetchOrderById } from '../services/orders';

export default function OrderDetailsScreen({ route, navigation }) {
  const { orderId } = route.params;

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        setLoading(true);
        const data = await fetchOrderById(orderId);
        setOrder(data?.order || data);
      } catch (e) {
        setError(e?.message || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, padding: 16 }}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, padding: 16, gap: 10 }}>
        <Text style={{ color: 'crimson' }}>{error}</Text>
        <Button title="Back" onPress={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 16, gap: 10 }}>
      <Text style={{ fontSize: 18, fontWeight: '600' }}>Order Details</Text>
      <Text>Order ID: {orderId}</Text>
      {!!order?.status && <Text>Status: {order.status}</Text>}
      {!!order?.total && <Text>Total: {order.total}</Text>}

      <View style={{ marginTop: 12 }}>
        <Button
          title="Track this order"
          onPress={() => navigation.navigate('TrackOrder', { orderId })}
        />
      </View>
    </SafeAreaView>
  );
}
