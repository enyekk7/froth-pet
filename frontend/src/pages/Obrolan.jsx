import { useState, useEffect, useRef } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import ConnectButton from '../components/ConnectButton';
import { MessageCircle, Lock, Coins } from 'lucide-react';
import { getChatMessages, sendChatMessage } from '../lib/mongodb';
import { frothAddress, frothAbi } from '../lib/contracts';
import { formatEther } from 'viem';

export default function ObrolanPage() {
  const { address, isConnected } = useAccount();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showLockedModal, setShowLockedModal] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Check FROTH token balance
  const { data: balance, isLoading: isLoadingBalance } = useReadContract({
    address: frothAddress,
    abi: frothAbi,
    functionName: 'balanceOf',
    args: [address || '0x0000000000000000000000000000000000000000'],
    query: { enabled: !!address && isConnected },
  });

  const hasFrothToken = balance !== undefined && balance > 0n;

  // Fetch messages from database on mount and periodically (only if has token)
  useEffect(() => {
    if (!isConnected || !hasFrothToken) return;

    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const result = await getChatMessages(100);
        if (result.success) {
          setMessages(result.data || []);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
    
    // Refresh messages every 3 seconds
    const interval = setInterval(fetchMessages, 3000);
    
    return () => clearInterval(interval);
  }, [isConnected, hasFrothToken]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !address || isSending || !hasFrothToken) {
      if (!hasFrothToken) {
        setShowLockedModal(true);
      }
      return;
    }

    setIsSending(true);
    const messageText = inputMessage.trim();
    setInputMessage('');

    try {
      const sender = address.slice(0, 6) + '...' + address.slice(-4);
      const result = await sendChatMessage(sender, messageText, address);
      
      if (result.success) {
        // Add message to local state immediately
        setMessages((prev) => [...prev, result.data]);
        // Scroll to bottom
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      } else {
        console.error('Failed to send message:', result.error);
        // Restore input on error
        setInputMessage(messageText);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setInputMessage(messageText);
    } finally {
      setIsSending(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 pb-24">
        <div className="bg-white rounded-xl p-8 shadow-lg max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4 text-center">Connect Wallet</h2>
          <p className="text-gray-600 mb-4 text-center text-sm">
            Connect your wallet to join the FROTH holder chat!
          </p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  if (isLoadingBalance) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 pb-24">
        <div className="text-center">
          <div className="text-xl font-semibold">Checking FROTH balance...</div>
        </div>
      </div>
    );
  }

  if (!hasFrothToken) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 pb-24">
        <div className="bg-white rounded-xl p-8 shadow-lg max-w-md w-full text-center">
          <Lock className="w-20 h-20 mx-auto mb-4 text-red-500" strokeWidth={1.5} />
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Chat Locked</h2>
          <p className="text-gray-600 mb-4">
            You need to hold FROTH tokens to access the chat room.
          </p>
          <div className="bg-gray-100 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2 text-gray-700">
              <Coins className="text-yellow-600" size={20} strokeWidth={2} />
              <span className="font-semibold">
                Current Balance: {balance ? formatEther(balance) : '0'} FROTH
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <a
              href="https://swap.kittypunch.xyz/swap?tokens=0x0000000000000000000000000000000000000000-0xb73bf8e6a4477a952e0338e6cc00cc0ce5ad04ba"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Get FROTH Tokens
            </a>
            <button
              onClick={() => window.location.reload()}
              className="text-gray-600 text-sm hover:text-gray-800 underline"
            >
              Refresh Balance
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col pb-20">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 p-4 pb-2 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <MessageCircle className="text-green-600" size={28} strokeWidth={2.5} />
              Chat (FROTH Holders)
            </h1>
            <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-lg border border-green-200">
              <Coins className="text-green-600" size={16} strokeWidth={2} />
              <span className="text-xs font-semibold text-green-700">
                {formatEther(balance || 0n)} FROTH
              </span>
            </div>
          </div>
        </div>

        {/* Messages Area - Scrollable */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 bg-gray-50"
          style={{ minHeight: 0 }} // Important for flex scrolling
        >
          {isLoading && messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => {
                const isOwnMessage = msg.walletAddress?.toLowerCase() === address?.toLowerCase();
                const timestamp = msg.createdAt 
                  ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : msg.timestamp || '';
                
                return (
                  <div
                    key={msg._id || msg.id}
                    className={`p-3 rounded-lg ${
                      isOwnMessage
                        ? 'bg-blue-100 ml-auto max-w-[80%]'
                        : 'bg-white max-w-[80%]'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-sm text-gray-800">
                        {msg.sender || 'Unknown'}
                      </span>
                      <span className="text-xs text-gray-500">{timestamp}</span>
                    </div>
                    <p className="text-gray-800 break-words">{msg.message}</p>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Form - Fixed above navbar */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={isSending}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isSending}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>
      </div>

      {/* Locked Modal (if user tries to send without token) */}
      {showLockedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 shadow-lg max-w-md w-full text-center">
            <Lock className="w-16 h-16 mx-auto mb-4 text-red-500" strokeWidth={1.5} />
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Chat Locked</h2>
            <p className="text-gray-600 mb-4">
              You need to hold FROTH tokens to send messages in the chat.
            </p>
            <div className="bg-gray-100 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center gap-2 text-gray-700">
                <Coins className="text-yellow-600" size={20} strokeWidth={2} />
                <span className="font-semibold">
                  Current Balance: {balance ? formatEther(balance) : '0'} FROTH
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <a
                href="https://swap.kittypunch.xyz/swap?tokens=0x0000000000000000000000000000000000000000-0xb73bf8e6a4477a952e0338e6cc00cc0ce5ad04ba"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Get FROTH Tokens
              </a>
              <button
                onClick={() => setShowLockedModal(false)}
                className="text-gray-600 text-sm hover:text-gray-800 underline"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
