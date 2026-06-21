import { Button, Form, Host, Section, TextField } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  controlSize,
  keyboardType,
  submitLabel,
  textFieldStyle,
} from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';
import { Alert, Text, View, useColorScheme } from 'react-native';

type RentalRecordFormProps = {
  saving?: boolean;
  rentPrice: number;
  electricPrice: number;
  waterPrice: number;
  onCancel: () => void;
  onSubmit: (input: {
    month: string;
    electricOld: number;
    electricNew: number;
    waterOld: number;
    waterNew: number;
  }) => Promise<void>;
};

export function RentalRecordForm({
  saving,
  rentPrice,
  electricPrice,
  waterPrice,
  onCancel,
  onSubmit,
}: RentalRecordFormProps) {
  const dark = useColorScheme() === 'dark';
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [electricOld, setElectricOld] = useState('');
  const [electricNew, setElectricNew] = useState('');
  const [waterOld, setWaterOld] = useState('');
  const [waterNew, setWaterNew] = useState('');

  const eOld = parseNumber(electricOld);
  const eNew = parseNumber(electricNew);
  const wOld = parseNumber(waterOld);
  const wNew = parseNumber(waterNew);
  const electricUsed = Math.max(0, eNew - eOld);
  const waterUsed = Math.max(0, wNew - wOld);
  const electricAmount = electricUsed * electricPrice;
  const waterAmount = waterUsed * waterPrice;
  const total = rentPrice + electricAmount + waterAmount;

  const handleSubmit = async () => {
    if (!month || eNew < eOld || wNew < wOld) {
      Alert.alert('Dữ liệu không hợp lệ', 'Kiểm tra tháng và chỉ số điện/nước mới ≥ cũ.');
      return;
    }
    await onSubmit({ month, electricOld: eOld, electricNew: eNew, waterOld: wOld, waterNew: wNew });
  };

  return (
    <View style={{ gap: 16 }}>
      <View
        style={{
          borderRadius: 18,
          borderCurve: 'continuous',
          overflow: 'hidden',
          backgroundColor: dark ? '#111827' : '#FFFFFF',
        }}>
        <Host useViewportSizeMeasurement>
          <Form>
            <Section title="Tháng">
              <TextField
                placeholder="YYYY-MM"
                onTextChange={setMonth}
                modifiers={[textFieldStyle('roundedBorder'), submitLabel('next')]}
              />
            </Section>
            <Section title="Điện (kWh)">
              <TextField
                placeholder="Chỉ số cũ"
                onTextChange={setElectricOld}
                modifiers={[textFieldStyle('roundedBorder'), keyboardType('decimal-pad'), submitLabel('next')]}
              />
              <TextField
                placeholder="Chỉ số mới"
                onTextChange={setElectricNew}
                modifiers={[textFieldStyle('roundedBorder'), keyboardType('decimal-pad'), submitLabel('next')]}
              />
            </Section>
            <Section title="Nước (m³)">
              <TextField
                placeholder="Chỉ số cũ"
                onTextChange={setWaterOld}
                modifiers={[textFieldStyle('roundedBorder'), keyboardType('decimal-pad'), submitLabel('next')]}
              />
              <TextField
                placeholder="Chỉ số mới"
                onTextChange={setWaterNew}
                modifiers={[textFieldStyle('roundedBorder'), keyboardType('decimal-pad'), submitLabel('done')]}
              />
            </Section>
            <Section>
              <Button
                label={saving ? 'Đang lưu...' : 'Lưu hóa đơn'}
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

      {(electricNew || waterNew) ? (
        <View
          style={{
            borderRadius: 18,
            borderCurve: 'continuous',
            backgroundColor: dark ? '#111827' : '#EFF6FF',
            padding: 16,
            gap: 8,
          }}>
          <Text style={{ color: dark ? '#93C5FD' : '#1D4ED8', fontWeight: '700', fontSize: 14 }}>
            Tạm tính
          </Text>
          <Row label="Tiền phòng" value={fmt(rentPrice)} />
          <Row label={`Điện (${electricUsed} kWh × ${fmt(electricPrice)})`} value={fmt(electricAmount)} />
          <Row label={`Nước (${waterUsed} m³ × ${fmt(waterPrice)})`} value={fmt(waterAmount)} />
          <View style={{ borderTopWidth: 1, borderColor: dark ? '#1E3A5F' : '#BFDBFE', paddingTop: 8, marginTop: 4 }}>
            <Row label="Tổng cộng" value={fmt(total)} bold />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  const dark = useColorScheme() === 'dark';
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: dark ? '#94A3B8' : '#475569', fontSize: 13, fontWeight: bold ? '700' : '400' }}>
        {label}
      </Text>
      <Text style={{ color: dark ? '#F8FAFC' : '#0F172A', fontSize: 13, fontWeight: bold ? '800' : '600' }}>
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
