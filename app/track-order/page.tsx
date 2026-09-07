import { Suspense } from 'react';
import TrackOrderClient from './TrackOrderClient';

export default function TrackOrderPage() {
  return (
    <Suspense fallback={null}>
      <TrackOrderClient />
    </Suspense>
  );
}