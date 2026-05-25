'use client';

import CreateProduct from '@/components/mint/product';

// Legacy path — kept for deep-links from older flows. Routes through the
// unified Create Item form.
export default function LegacyCreateRoute() {
  return <CreateProduct />;
}
