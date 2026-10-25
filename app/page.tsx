import { FilesPanel } from '@/components/files-panel';
import { SettingsDialog } from '@/components/settings-dialog';
import { Form } from './form';

export default function Home() {
  return (
    <div className="flex">
      <aside className="min-h-screen w-72 shrink-0 space-y-2 border-r p-4 font-mono">
        <SettingsDialog />
        <FilesPanel />
      </aside>
      <div className="flex-1">
        <Form />
      </div>
    </div>
  );
}
