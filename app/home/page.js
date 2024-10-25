import dynamic from 'next/dynamic';

const DynamicHomePage = dynamic(() => import('./DynamicHomePage'));

export default function HomePage() {
  return <DynamicHomePage />;
}
