import { FlexWidget, TextWidget } from 'react-native-android-widget';

// Home-screen widget: big due count + tap to open the app.
export function DueWidget({ count }: { count: number }) {
  const done = count <= 0;
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#111111',
        borderRadius: 24,
        padding: 12,
      }}
    >
      <TextWidget
        text={done ? '✓' : String(count)}
        style={{ fontSize: 40, fontFamily: 'sans-serif-medium', color: '#FFFFFF' }}
      />
      <TextWidget
        text={done ? 'all done' : count === 1 ? 'card due' : 'cards due'}
        style={{ fontSize: 13, color: '#A0A0A5', marginTop: 2 }}
      />
    </FlexWidget>
  );
}
