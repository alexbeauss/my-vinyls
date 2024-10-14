import dynamic from 'next/dynamic';

const DynamicHomePage = dynamic(() => import('./DynamicHomePage'), { ssr: false });

export default function HomePage() {
  return <DynamicHomePage />;
}
