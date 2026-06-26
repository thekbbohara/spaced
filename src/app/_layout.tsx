import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { colors, spacing } from '@/lib/design';
import { ensurePermission } from '@/lib/notifications';
import { storage } from '@/lib/storage';
import { syncReminders, type Settings } from '@/lib/topics';

type IoniconName = keyof typeof Ionicons.glyphMap;

const TABS: { name: string; title: string; icon: IoniconName }[] = [
  { name: '(today)', title: 'Today', icon: 'flash' },
  { name: '(focus)', title: 'Focus', icon: 'timer' },
  { name: '(topics)', title: 'Topics', icon: 'albums' },
  { name: '(settings)', title: 'Settings', icon: 'settings' },
];

export default function RootLayout() {
  useEffect(() => {
    const settings = storage.get<Partial<Settings> | null>('settings', {});
    if (settings?.remindersEnabled !== false) {
      ensurePermission().then(() => syncReminders()); // re-arm reminders on open
    }
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.mutedSoft,
        tabBarStyle: {
          backgroundColor: colors.canvas,
          borderTopColor: colors.hairline,
          borderTopWidth: 1,
          height: 64 + spacing.md,
          paddingTop: spacing.xs,
          paddingBottom: spacing.md,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarItemStyle: { paddingVertical: spacing.xxs },
      }}
    >
      {TABS.map(({ name, title, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? icon : (`${icon}-outline` as IoniconName)}
                size={24}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
