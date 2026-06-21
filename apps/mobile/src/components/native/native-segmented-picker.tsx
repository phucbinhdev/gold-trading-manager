import { Pressable, Text, View } from 'react-native';

type NativeSegmentedPickerProps<T extends string> = {
  value: T;
  options: Array<{ label: string; value: T }>;
  onChange: (value: T) => void;
};

export function NativeSegmentedPicker<T extends string>({
  value,
  options,
  onChange,
}: NativeSegmentedPickerProps<T>) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, borderRadius: 12, backgroundColor: '#E5E7EB', padding: 4 }}>
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={{
              flex: 1,
              borderRadius: 9,
              backgroundColor: selected ? '#FFFFFF' : 'transparent',
              paddingVertical: 8,
              alignItems: 'center',
            }}>
            <Text style={{ fontWeight: '700', color: selected ? '#111827' : '#6B7280' }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
