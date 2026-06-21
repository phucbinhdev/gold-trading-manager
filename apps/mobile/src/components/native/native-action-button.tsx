import { Pressable, Text } from 'react-native';

type NativeActionButtonProps = {
  label: string;
  systemImage?: string;
  onPress: () => void;
  prominent?: boolean;
};

export function NativeActionButton({ label, onPress, prominent }: NativeActionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        alignSelf: 'flex-start',
        borderRadius: 999,
        backgroundColor: prominent ? '#111827' : '#E5E7EB',
        opacity: pressed ? 0.72 : 1,
        paddingHorizontal: 16,
        paddingVertical: 10,
      })}>
      <Text style={{ color: prominent ? '#FFFFFF' : '#111827', fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}
