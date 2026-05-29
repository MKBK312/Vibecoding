"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { ChatHub } from "@/components/chat/ChatHub";
import { useChat } from "@/hooks/useChat";

export default function Home() {
  const [topK, setTopK] = useState(5);
  const [temperature, setTemperature] = useState(0.7);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const chat = useChat(topK, temperature);

  return (
    <div className="flex h-full">
      {/* Overlay for mobile/tablet sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        topK={topK}
        temperature={temperature}
        onTopKChange={setTopK}
        onTemperatureChange={setTemperature}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      <ChatHub
        messages={chat.messages}
        isStreaming={chat.isStreaming}
        streamingContent={chat.streamingContent}
        openSources={chat.openSources}
        messagesEndRef={chat.messagesEndRef}
        onSend={chat.handleSend}
        onStop={chat.stopGeneration}
        onToggleSources={chat.toggleSources}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />
    </div>
  );
}
