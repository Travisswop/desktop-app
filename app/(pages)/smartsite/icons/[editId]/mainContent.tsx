'use client';
import SmartsiteIconLivePreview from '@/components/smartsite/SmartsiteIconLivePreview';
import React, { useEffect, useMemo, useState } from 'react';
import { normalizeSmartsiteTemplateBlockOrder } from '@/lib/smartsite-template-order';

const MicrositeEditMainContentPage = ({ data, token }: any) => {
  const [templateOrder, setTemplateOrder] = useState<string[]>(() =>
    normalizeSmartsiteTemplateBlockOrder(data?.data, data?.data?.templateOrder),
  );

  useEffect(() => {
    if (data) {
      setTemplateOrder(
        normalizeSmartsiteTemplateBlockOrder(
          data.data,
          data.data.templateOrder,
        ),
      );
    }
  }, [data]);

  const previewData = useMemo(
    () => ({
      ...data.data,
      templateOrder,
    }),
    [data.data, templateOrder],
  );

  return (
    <main className="main-container overflow-hidden">
      <SmartsiteIconLivePreview
        data={previewData}
        token={token}
        onTemplateOrderChange={setTemplateOrder}
      />
    </main>
  );
};

export default MicrositeEditMainContentPage;
