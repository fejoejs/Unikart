import React from 'react';
import { AlertCircle } from 'lucide-react';

export function FormFieldError({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-center space-x-1 mt-1 text-xs text-rose-500 font-medium animate-fadeIn">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export default FormFieldError;
