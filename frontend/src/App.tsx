import { useState } from 'react'
import Chat from './components/chat/Chat'

function App() {
  const [chatId] = useState(() => `chat-${Date.now()}`)

  return (
    <div className="h-screen bg-background">
      <Chat chatId={chatId} />
    </div>
  )
}

export default App