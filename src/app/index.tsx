import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/hooks/use-auth';

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#4361EE', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#FFFFFF" size="large" />
      </View>
    );
  }

  return <Redirect href={user ? '/conversations' : '/login'} />;
}
