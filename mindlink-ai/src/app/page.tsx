import { Sidebar } from '@/components/layout/Sidebar';
import { ChatArea } from '@/components/chat/ChatArea';

export default function Home() {
  return (
    <main className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b bg-white flex items-center px-6">
          <h1 className="text-lg font-semibold text-gray-800">💬 AI 对话</h1>
        </header>
        <ChatArea />
      </div>
    </main>
  );
}
