import { FilesPanel } from '@/components/files-panel';
import { Form } from './form';

export default function Home() {
  return (
    <div className="flex">
      <aside className="min-h-screen w-72 shrink-0 border-r">
        <FilesPanel />
      </aside>
      <div className="flex-1">
        <Form />
      </div>
    </div>
  );
}
