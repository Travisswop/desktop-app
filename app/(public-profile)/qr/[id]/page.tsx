import { redirect } from 'next/navigation';
export default async function QR({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const fetchData = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/web/qr/${id}`,
    { next: { revalidate: 1 } }
  );
  const data = await fetchData.json();

  if (data?.data?.micrositeUrl) {
    return redirect(data.data.micrositeUrl);
  }

  return redirect('https://www.swopme.co');
}
