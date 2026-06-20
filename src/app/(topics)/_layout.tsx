import { Stack } from 'expo-router/stack';
import { colors } from '@/lib/design';

export default function TopicsLayout() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerStyle: { backgroundColor: colors.canvas },
        headerShadowVisible: false,
        headerTintColor: colors.ink,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Topics' }} />
      <Stack.Screen name="topic/[id]" options={{ title: '', headerLargeTitle: false }} />
      <Stack.Screen
        name="edit/[id]"
        options={{ title: 'Edit topic', presentation: 'modal', headerLargeTitle: false }}
      />
      <Stack.Screen
        name="material/[id]"
        options={{ presentation: 'modal', headerLargeTitle: false }}
      />
      <Stack.Screen name="cards/[id]" options={{ title: 'Cards', headerLargeTitle: false }} />
      <Stack.Screen
        name="study/[id]"
        options={{ headerShown: false, presentation: 'fullScreenModal' }}
      />
    </Stack>
  );
}
