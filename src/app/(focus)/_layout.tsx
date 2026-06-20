import { Stack } from 'expo-router/stack';
import { colors } from '@/lib/design';

export default function FocusLayout() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerStyle: { backgroundColor: colors.canvas },
        headerShadowVisible: false,
        headerTintColor: colors.ink,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Focus' }} />
      <Stack.Screen name="run" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
    </Stack>
  );
}
