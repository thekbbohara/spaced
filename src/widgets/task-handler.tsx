import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { dueTodayCount } from '@/lib/topics';
import { DueWidget } from './DueWidget';

// Runs in a headless JS context whenever Android asks the widget to refresh
// (added, periodic update, resize). Reads the live due count from storage.
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  let count = 0;
  try {
    count = dueTodayCount();
  } catch {
    count = 0;
  }
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(<DueWidget count={count} />);
      break;
    // WIDGET_CLICK is handled by clickAction="OPEN_APP" on the widget itself.
    default:
      break;
  }
}
