'use client';

import { Suspense } from 'react';
import ResetPassword from '@gametime/frontend/pages/ResetPassword.jsx';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPassword />
    </Suspense>
  );
}
