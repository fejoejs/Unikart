import React from 'react';
import { Outlet } from 'react-router-dom';

export function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {children || <Outlet />}
      </div>
    </div>
  );
}

export default AuthLayout;
