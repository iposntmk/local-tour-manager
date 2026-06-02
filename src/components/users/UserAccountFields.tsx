import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface UserAccountFieldsProps {
  isEdit: boolean;
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
}

export function UserAccountFields({ isEdit, register, errors }: UserAccountFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="email">
          Email <span className="text-destructive">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          {...register('email', { required: 'Email là bắt buộc' })}
          placeholder="user@example.com"
        />
        {typeof errors.email?.message === 'string' && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">
          Mật khẩu {!isEdit && <span className="text-destructive">*</span>}
          {isEdit && <span className="text-muted-foreground text-xs">(để trống nếu không đổi)</span>}
        </Label>
        <Input
          id="password"
          type="password"
          {...register('password')}
          placeholder={isEdit ? '••••••••' : 'Tối thiểu 6 ký tự'}
        />
        {!isEdit && (
          <p className="text-xs text-muted-foreground">Mật khẩu phải có ít nhất 6 ký tự</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="fullName">Họ và tên</Label>
        <Input
          id="fullName"
          {...register('fullName')}
          placeholder="Nguyễn Văn A"
        />
      </div>
    </>
  );
}
