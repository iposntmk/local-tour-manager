import { useState } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { REQUIRED_PIN } from './shared';

interface PinGateProps {
  onUnlock: () => void;
}

export const PinGate = ({ onUnlock }: PinGateProps) => {
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === REQUIRED_PIN) {
      sessionStorage.setItem('statistics.unlocked', 'true');
      onUnlock();
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Lock className="h-5 w-5" />
          Statistics Access
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="pin" className="text-sm font-medium">
              Nhập mã PIN (gợi ý: số điện thoại của bạn)
            </label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setPinError(false);
              }}
              placeholder="Enter PIN"
              className={pinError ? 'border-red-500' : ''}
              autoFocus
            />
            {pinError && (
              <p className="text-sm text-red-500">Mã PIN không đúng. Vui lòng thử lại.</p>
            )}
          </div>
          <Button type="submit" className="w-full">
            Unlock Statistics
          </Button>
        </form>
      </div>
    </div>
  );
};
