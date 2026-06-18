type Props = {
  params: Promise<{ id: string }>;
};

export default async function LegacyFeedPostRedirect({ params }: Props) {
  const { id } = await params;
  const target = `/feed/${encodeURIComponent(id)}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 text-center text-sm text-gray-600">
      <script
        dangerouslySetInnerHTML={{
          __html: `window.location.replace(${JSON.stringify(target)} + window.location.hash);`,
        }}
      />
      <a className="text-black underline" href={target}>
        Opening feed...
      </a>
    </main>
  );
}
