import * as React from "react";
import { Textarea, TextareaProps } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface TextareaWithSaveProps extends Omit<TextareaProps, 'onChange'> {
  storageKey: string;
  onValueChange?: (value: string) => void;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

const TextareaWithSave = React.forwardRef<HTMLTextAreaElement, TextareaWithSaveProps>(
  ({ storageKey, onValueChange, value, onChange, className, ...props }, ref) => {
    const [textValue, setTextValue] = React.useState(value || '');
    const [saveEnabled, setSaveEnabled] = React.useState(false);
    const debounceTimerRef = React.useRef<NodeJS.Timeout>();

    const checkboxStorageKey = `${storageKey}-save-enabled`;

    // Load saved data on mount
    React.useEffect(() => {
      const savedEnabled = localStorage.getItem(checkboxStorageKey) === 'true';
      setSaveEnabled(savedEnabled);

      if (savedEnabled) {
        const savedValue = localStorage.getItem(storageKey);
        if (savedValue !== null) {
          setTextValue(savedValue);
          onValueChange?.(savedValue);
        }
      }
    }, [storageKey, checkboxStorageKey, onValueChange]);

    // Sync external value changes
    React.useEffect(() => {
      if (value !== undefined) {
        setTextValue(value);
      }
    }, [value]);

    // Debounced save function
    const debouncedSave = React.useCallback(
      (val: string) => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
          if (saveEnabled) {
            localStorage.setItem(storageKey, val);
          }
        }, 300);
      },
      [saveEnabled, storageKey]
    );

    // Handle text change
    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setTextValue(newValue);
      onChange?.(e);
      onValueChange?.(newValue);
      debouncedSave(newValue);
    };

    // Handle checkbox change
    const handleCheckboxChange = (checked: boolean) => {
      setSaveEnabled(checked);
      localStorage.setItem(checkboxStorageKey, String(checked));

      if (checked) {
        // Save current value when checkbox is enabled
        localStorage.setItem(storageKey, textValue);
      } else {
        // Clear saved data when checkbox is disabled
        localStorage.removeItem(storageKey);
      }
    };

    // Cleanup on unmount
    React.useEffect(() => {
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }, []);

    return (
      <div className="space-y-2">
        <Textarea
          ref={ref}
          value={textValue}
          onChange={handleTextChange}
          className={className}
          {...props}
        />
        <div className="flex items-center gap-2">
          <Checkbox
            id={`${storageKey}-checkbox`}
            checked={saveEnabled}
            onCheckedChange={handleCheckboxChange}
          />
          <Label
            htmlFor={`${storageKey}-checkbox`}
            className="cursor-pointer text-sm text-muted-foreground"
          >
            Save to browser (remember data)
          </Label>
        </div>
      </div>
    );
  }
);

TextareaWithSave.displayName = "TextareaWithSave";

export { TextareaWithSave };
