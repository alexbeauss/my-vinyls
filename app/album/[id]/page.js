"use client";
import { useParams } from 'next/navigation';
import AlbumDetails from '../../components/AlbumDetails';

export default function AlbumPage() {
  const { id } = useParams();

  return (
    <div className="container mx-auto px-4 py-8">
      <AlbumDetails albumId={id} />
    </div>
  );
}
