import { useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';

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

  const labelColor = dark ? '#94A3B8' : '#64748B';
  const textColor = dark ? '#F8FAFC' : '#0F172A';
  const borderColor = dark ? '#334155' : '#E2E8F0';
  const bg = dark ? '#1E293B' : '#FFFFFF';

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
    <View style={{ gap: 16, padding: 16 }}>
      <View style={{ backgroundColor: bg, borderRadius: 16, padding: 16, gap: 12 }}>
        <Text style={{ color: textColor, fontWeight: '700', fontSize: 17 }}>Bán: {deviceName}</Text>
        <View style={{ gap: 4 }}>
          <Text style={{ color: labelColor, fontSize: 13, fontWeight: '600' }}>Giá bán</Text>
          <TextInput
            value={sellingPrice}
            onChangeText={setSellingPrice}
            keyboardType="decimal-pad"
            style={{ borderWidth: 1, borderColor, borderRadius: 10, padding: 12, color: textColor, fontSize: 15 }}
          />
        </View>
        <View style={{ gap: 4 }}>
          <Text style={{ color: labelColor, fontSize: 13, fontWeight: '600' }}>Ghi chú</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
            style={{ borderWidth: 1, borderColor, borderRadius: 10, padding: 12, color: textColor, fontSize: 15 }}
          />
        </View>
      </View>

      {price > 0 && (
        <View
          style={{
            backgroundColor: profit !== null && profit >= 0
              ? (dark ? '#052E16' : '#F0FDF4')
              : (dark ? '#2D0A0A' : '#FEF2F2'),
            borderRadius: 16,
            padding: 16,
            gap: 6,
          }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: labelColor, fontSize: 13 }}>Giá vốn</Text>
            <Text style={{ color: textColor, fontSize: 13, fontWeight: '600' }}>{fmt(totalCost)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: labelColor, fontSize: 13 }}>Giá bán</Text>
            <Text style={{ color: textColor, fontSize: 13, fontWeight: '600' }}>{fmt(price)}</Text>
          </View>
          {profit !== null && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: dark ? '#166534' : '#BBF7D0', paddingTop: 8, marginTop: 4 }}>
              <Text style={{ color: labelColor, fontSize: 13, fontWeight: '700' }}>{profit >= 0 ? 'Lãi' : 'Lỗ'}</Text>
              <Text style={{ color: profit >= 0 ? '#059669' : '#DC2626', fontSize: 13, fontWeight: '800' }}>{fmt(Math.abs(profit))}</Text>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={saving}
        style={{
          backgroundColor: '#059669',
          borderRadius: 14,
          padding: 16,
          alignItems: 'center',
          opacity: saving ? 0.6 : 1,
        }}>
        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>
          {saving ? 'Đang lưu...' : 'Xác nhận bán'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onCancel} style={{ alignItems: 'center', padding: 12 }}>
        <Text style={{ color: labelColor, fontSize: 15 }}>Hủy</Text>
      </TouchableOpacity>
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
