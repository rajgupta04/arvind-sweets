import React from 'react';
import { Button, SafeAreaView, Text, View } from 'react-native';

import { useAuth } from '../context/AuthContext';

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();

  const role = user?.role || user?.user?.role;

  return (
    <SafeAreaView style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: '600' }}>Home</Text>
      <Text>Signed in as: {user?.name || user?.email || 'User'}</Text>
      {!!role && <Text>Role: {role}</Text>}

      <View style={{ gap: 10 }}>
        <Button title="My Orders" onPress={() => navigation.navigate('Orders')} />
        <Button title="Logout" onPress={logout} />
      </View>

      <Text style={{ marginTop: 16, opacity: 0.7 }}>
        Notes: Orders + live tracking are under Orders.
      </Text>
    </SafeAreaView>
  );
}
