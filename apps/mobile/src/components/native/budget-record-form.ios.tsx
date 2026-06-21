import { Button, Form, Host, Picker, Section, Text, TextField } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  controlSize,
  keyboardType,
  lineLimit,
  pickerStyle,
  submitLabel,
  tag,
  textFieldStyle,
} from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';
import { Alert, View } from 'react-native';

type BudgetRecordType = 'expense' | 'income';

type BudgetRecordFormProps = {
  saving?: boolean;
  onCancel: () => void;
  onSubmit: (input: {
    recordType: BudgetRecordType;
    name: string;
    amount: number;
    note?: string;
  }) => Promise<void>;
};

export function BudgetRecordForm({ saving, onCancel, onSubmit }: BudgetRecordFormProps) {
  const [recordType, setRecordType] = useState<BudgetRecordType>('expense');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = async () => {
    const parsedAmount = parseNumber(amount);

    if (!name.trim() || parsedAmount <= 0) {
      Alert.alert('Thiếu dữ liệu', 'Nhập tên khoản và số tiền lớn hơn 0.');
      return;
    }

    await onSubmit({
      recordType,
      name: name.trim(),
      amount: parsedAmount,
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
          <Section title="Khoản thu chi">
            <Picker
              selection={recordType}
              onSelectionChange={(value) => setRecordType(value as BudgetRecordType)}
              modifiers={[pickerStyle('segmented')]}>
              <Text modifiers={[tag('expense')]}>Chi</Text>
              <Text modifiers={[tag('income')]}>Thu</Text>
            </Picker>
            <TextField
              placeholder="Tên khoản"
              onTextChange={setName}
              modifiers={[textFieldStyle('roundedBorder'), submitLabel('next')]}
            />
            <TextField
              placeholder="Số tiền"
              onTextChange={setAmount}
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
              label={saving ? 'Đang lưu...' : recordType === 'income' ? 'Lưu khoản thu' : 'Lưu khoản chi'}
              systemImage={recordType === 'income' ? 'arrow.down.circle.fill' : 'arrow.up.circle.fill'}
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
