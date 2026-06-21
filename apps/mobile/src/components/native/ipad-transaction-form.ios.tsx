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

type IpadTransactionFormProps = {
  saving?: boolean;
  onCancel: () => void;
  onSubmit: (input: {
    purchaseDate: string;
    deviceName: string;
    storage?: string;
    color?: string;
    purchasePrice: number;
    extraCost?: number;
    loanAmount?: number;
    note?: string;
  }) => Promise<void>;
};

export function IpadTransactionForm({ saving, onCancel, onSubmit }: IpadTransactionFormProps) {
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [deviceName, setDeviceName] = useState('');
  const [storage, setStorage] = useState('');
  const [color, setColor] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [extraCost, setExtraCost] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = async () => {
    const price = parseNumber(purchasePrice);

    if (!purchaseDate || !deviceName.trim() || price <= 0) {
      Alert.alert('Thiếu dữ liệu', 'Nhập ngày, tên máy và giá mua lớn hơn 0.');
      return;
    }

    await onSubmit({
      purchaseDate,
      deviceName: deviceName.trim(),
      storage: storage.trim() || undefined,
      color: color.trim() || undefined,
      purchasePrice: price,
      extraCost: parseNumber(extraCost),
      loanAmount: parseNumber(loanAmount),
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
          <Section title="Thông tin máy">
            <TextField
              placeholder="Ngày nhập (YYYY-MM-DD)"
              onTextChange={setPurchaseDate}
              modifiers={[textFieldStyle('roundedBorder'), submitLabel('next')]}
            />
            <TextField
              placeholder="Tên máy"
              onTextChange={setDeviceName}
              modifiers={[textFieldStyle('roundedBorder'), submitLabel('next')]}
            />
            <TextField
              placeholder="Dung lượng"
              onTextChange={setStorage}
              modifiers={[textFieldStyle('roundedBorder'), submitLabel('next')]}
            />
            <TextField
              placeholder="Màu"
              onTextChange={setColor}
              modifiers={[textFieldStyle('roundedBorder'), submitLabel('next')]}
            />
          </Section>
          <Section title="Giá vốn">
            <TextField
              placeholder="Giá mua"
              onTextChange={setPurchasePrice}
              modifiers={[textFieldStyle('roundedBorder'), keyboardType('decimal-pad'), submitLabel('next')]}
            />
            <TextField
              placeholder="Chi phí thêm"
              onTextChange={setExtraCost}
              modifiers={[textFieldStyle('roundedBorder'), keyboardType('decimal-pad'), submitLabel('next')]}
            />
            <TextField
              placeholder="Tiền nợ"
              onTextChange={setLoanAmount}
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
              label={saving ? 'Đang lưu...' : 'Lưu máy'}
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
