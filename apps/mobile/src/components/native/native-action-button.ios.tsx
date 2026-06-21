import { Button, Host } from '@expo/ui/swift-ui';
import { buttonStyle, controlSize } from '@expo/ui/swift-ui/modifiers';

type NativeActionButtonProps = {
  label: string;
  systemImage: React.ComponentProps<typeof Button>['systemImage'];
  onPress: () => void;
  prominent?: boolean;
};

export function NativeActionButton({
  label,
  systemImage,
  onPress,
  prominent,
}: NativeActionButtonProps) {
  return (
    <Host matchContents>
      <Button
        label={label}
        systemImage={systemImage}
        onPress={onPress}
        modifiers={[buttonStyle(prominent ? 'glassProminent' : 'glass'), controlSize('large')]}
      />
    </Host>
  );
}
