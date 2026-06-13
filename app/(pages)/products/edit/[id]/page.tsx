'use client';

import { use } from 'react';
import CreateProduct from '@/components/mint/product';

// Edit an existing marketplace product. Reuses the Create Item form in edit
// mode — it prefills from the product and saves via PATCH.
export default function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <CreateProduct productId={id} />;
}
