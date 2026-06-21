import { Button, Form, Host, Section, TextField } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  controlSize,
  keyboardType,
  submitLabel,
  textFieldStyle,
} from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';
import { Alert, View } from 'react-native';

type SavingsFormProps = {
  saving?: boolean;
  onCancel: () => void;
  onSubmit: (input: {
    label: string;
    periodAmount: number;
    periodsLeft: number;
  }) => Promise<void>;
};

export function SavingsForm({ saving, onCancel, onSubmit }: SavingsFormProps) {
  const [label, setLabel] = useState('');
  const [periodAmount, setPeriodAmount] = useState('');
  const [periodsLeft, setPeriodsLeft] = useState('');

  const handleSubmit = async () => {
    const amount = parseNumber(periodAmount);
    const periods = parseNumber(periodsLeft);

    if (!label.trim() || amount <= 0 || periods <= 0) {
      Alert.alert('Thiếu dữ liệu', 'Nhập tên dây, số tiền mỗi kỳ và số kỳ còn lại lớn hơn 0.');
      return;
    }

    await onSubmit({ label: label.trim(), periodAmount: amount, periodsLeft: Math.round(periods) });
  };

  return (
    <View
      style={{
        borderRadius: 20,
        borderCurve: 'continuous',
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
      }}>
      <Host useViewportSizeMeasurement>
        <Form>
          <Section title="Dây tích góp">
            <TextField
              placeholder="Tên dây (VD: Dây họ tháng 6)"
              onTextChange={setLabel}
              modifiers={[textFieldStyle('roundedBorder'), submitLabel('next')]}
            />
            <TextField
              placeholder="Số tiền mỗi kỳ"
              onTextChange={setPeriodAmount}
              modifiers={[textFieldStyle('roundedBorder'), keyboardType('decimal-pad'), submitLabel('next')]}
            />
            <TextField
              placeholder="Số kỳ còn lại"
              onTextChange={setPeriodsLeft}
              modifiers={[textFieldStyle('roundedBorder'), keyboardType('decimal-pad'), submitLabel('done')]}
            />
          </Section>
          <Section>
            <Button
              label={saving ? 'Đang lưu...' : 'Tạo dây tích góp'}
              systemImage="plus.circle.fill"
              onPress={handleSubmit}
              modifiers={[buttonStyle('borderedProminent'), controlSize('large')]}
            />
            <Button
              label="Hủy"
              role="cancel"
              systemImage="xmark"
              onPress={onCancel}
              modifiers={[buttonStyle('bordered'), controlSize('large')]}
            />
          </Section>
        </Form>
      </Host>
    </View>
  );
}

function parseNumber(value: string) {
  const normalized = value.replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
