import { Stack } from 'expo-router/stack';
import { colors } from '@/lib/design';

export default function TodayLayout() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerStyle: { backgroundColor: colors.canvas },
        headerShadowVisible: false,
        headerTintColor: colors.ink,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Today' }} />
      <Stack.Screen
        name="add"
        options={{ title: 'What did you study?', presentation: 'modal' }}
      />
    </Stack>
  );
}
