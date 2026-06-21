import { Host, Picker, Text } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';

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
    <Host matchContents>
      <Picker selection={value} onSelectionChange={onChange} modifiers={[pickerStyle('segmented')]}>
        {options.map((option) => (
          <Text key={option.value} modifiers={[tag(option.value)]}>
            {option.label}
          </Text>
        ))}
      </Picker>
    </Host>
  );
}
