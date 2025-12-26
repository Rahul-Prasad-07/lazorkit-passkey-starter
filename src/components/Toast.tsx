"use client";

import React from 'react';

export default function Toast({ message, type = 'info' }: { message: string; type?: 'success' | 'error' | 'info' }) {
  const bg = type === 'success' ? 'bg-green-100 text-green-800' : type === 'error' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800';
  return (
    <div className={`fixed right-4 bottom-6 z-50 rounded-md px-4 py-2 shadow-md ${bg}`} role="status">
      <div className="text-sm">{message}</div>
    </div>
  );
}
