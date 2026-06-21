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
import { Alert, Text, View, useColorScheme } from 'react-native';

type IpadSellFormProps = {
  deviceName: string;
  totalCost: number;
  saving?: boolean;
  onCancel: () => void;
  onSubmit: (input: {
    sellingPrice: number;
    note?: string;
  }) => Promise<void>;
};

export function IpadSellForm({ deviceName, totalCost, saving, onCancel, onSubmit }: IpadSellFormProps) {
  const dark = useColorScheme() === 'dark';
  const [sellingPrice, setSellingPrice] = useState('');
  const [note, setNote] = useState('');

  const price = parseNumber(sellingPrice);
  const profit = price > 0 ? price - totalCost : null;

  const handleSubmit = async () => {
    if (price <= 0) {
      Alert.alert('Thiếu dữ liệu', 'Nhập giá bán lớn hơn 0.');
      return;
    }
    await onSubmit({ sellingPrice: price, note: note.trim() || undefined });
  };

  return (
    <View style={{ gap: 16 }}>
      <View
        style={{
          borderRadius: 20,
          borderCurve: 'continuous',
          overflow: 'hidden',
          backgroundColor: dark ? '#111827' : '#FFFFFF',
        }}>
        <Host useViewportSizeMeasurement>
          <Form>
            <Section title={`Bán: ${deviceName}`}>
              <TextField
                placeholder="Giá bán"
                onTextChange={setSellingPrice}
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
                label={saving ? 'Đang lưu...' : 'Xác nhận bán'}
                systemImage="checkmark.seal.fill"
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

      {price > 0 ? (
        <View
          style={{
            borderRadius: 18,
            borderCurve: 'continuous',
            backgroundColor: profit !== null && profit >= 0
              ? (dark ? '#052E16' : '#F0FDF4')
              : (dark ? '#2D0A0A' : '#FEF2F2'),
            padding: 16,
            gap: 8,
          }}>
          <Row label="Giá vốn" value={fmt(totalCost)} dark={dark} />
          <Row label="Giá bán" value={fmt(price)} dark={dark} />
          {profit !== null && (
            <View style={{ borderTopWidth: 1, borderColor: dark ? '#166534' : '#BBF7D0', paddingTop: 8, marginTop: 4 }}>
              <Row
                label={profit >= 0 ? 'Lãi' : 'Lỗ'}
                value={fmt(Math.abs(profit))}
                dark={dark}
                bold
                tone={profit >= 0 ? 'green' : 'red'}
              />
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

function Row({
  label,
  value,
  bold,
  dark,
  tone,
}: {
  label: string;
  value: string;
  bold?: boolean;
  dark: boolean;
  tone?: 'green' | 'red';
}) {
  const valueColor = tone === 'green' ? '#059669' : tone === 'red' ? '#DC2626' : dark ? '#F8FAFC' : '#0F172A';
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: dark ? '#94A3B8' : '#475569', fontSize: 13, fontWeight: bold ? '700' : '400' }}>
        {label}
      </Text>
      <Text style={{ color: valueColor, fontSize: 13, fontWeight: bold ? '800' : '600' }}>
        {value}
      </Text>
    </View>
  );
}

function parseNumber(value: string) {
  const normalized = value.replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function fmt(n: number) {
  return n.toLocaleString('vi-VN') + '₫';
}
