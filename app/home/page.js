import dynamic from 'next/dynamic';

const DynamicHomePage = dynamic(() => import('./DynamicHomePage'));

export const metadata = {
  title: 'MyVinyls - Ma Collection',
  description: 'Gérez votre collection de vinyles personnalisée avec des critiques IA',
};

export default function HomePage() {
  return <DynamicHomePage />;
}
