import { Platform } from 'react-native';
import { DueWidget } from '@/widgets/DueWidget';

// Push a fresh due count to any placed home-screen widget. No-op off Android and
// in Expo Go (the native module is absent there), where the require/call throws.
export async function updateDueWidget(count: number) {
  if (Platform.OS !== 'android') return;
  try {
    const { requestWidgetUpdate } = require('react-native-android-widget');
    await requestWidgetUpdate({
      widgetName: 'Due',
      renderWidget: () => <DueWidget count={count} />,
      widgetNotFound: () => {},
    });
  } catch {
    // widget not added, or running where the native module isn't available
  }
}
