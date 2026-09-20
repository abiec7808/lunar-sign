import React from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#090d16] text-slate-100 flex-col md:flex-row">
      <AdminSidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}
