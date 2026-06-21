import { Button, Form, Host, Section, TextField } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  controlSize,
  keyboardType,
  lineLimit,
  submitLabel,
  textFieldStyle,
} from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';
import { Alert, View } from 'react-native';

type GoldTransactionFormProps = {
  saving?: boolean;
  onCancel: () => void;
  onSubmit: (input: {
    transactionDate: string;
    amountChi: number;
    pricePerChi: number;
    note?: string;
  }) => Promise<void>;
};

export function GoldTransactionForm({ saving, onCancel, onSubmit }: GoldTransactionFormProps) {
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [amountChi, setAmountChi] = useState('');
  const [pricePerChi, setPricePerChi] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = async () => {
    const amount = parseNumber(amountChi);
    const price = parseNumber(pricePerChi);

    if (!transactionDate || amount <= 0 || price <= 0) {
      Alert.alert('Thiếu dữ liệu', 'Nhập ngày, số chỉ và giá mỗi chỉ lớn hơn 0.');
      return;
    }

    await onSubmit({
      transactionDate,
      amountChi: amount,
      pricePerChi: price,
      note: note.trim() || undefined,
    });
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
          <Section title="Giao dịch vàng">
            <TextField
              placeholder="Ngày giao dịch (YYYY-MM-DD)"
              onTextChange={setTransactionDate}
              modifiers={[textFieldStyle('roundedBorder'), submitLabel('next')]}
            />
            <TextField
              placeholder="Số chỉ"
              onTextChange={setAmountChi}
              modifiers={[textFieldStyle('roundedBorder'), keyboardType('decimal-pad'), submitLabel('next')]}
            />
            <TextField
              placeholder="Giá mỗi chỉ"
              onTextChange={setPricePerChi}
              modifiers={[textFieldStyle('roundedBorder'), keyboardType('decimal-pad'), submitLabel('next')]}
            />
            <TextField
              placeholder="Ghi chú"
              axis="vertical"
              onTextChange={setNote}
              modifiers={[textFieldStyle('roundedBorder'), lineLimit({ min: 2, max: 4 }), submitLabel('done')]}
            />
          </Section>
          <Section>
            <Button
              label={saving ? 'Đang lưu...' : 'Lưu giao dịch'}
              systemImage="checkmark.circle.fill"
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
