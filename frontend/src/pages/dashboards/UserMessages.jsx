import { useState, useEffect, useRef } from "react";
import axios from "axios";
import UserLayout from "../../components/user/UserLayout";
import useAuth from "../../context/useAuth";
import { API_BASE, authHeaders } from "../../lib/http";
import { FaPaperPlane, FaSearch, FaArrowLeft } from "react-icons/fa";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { useSearchParams, useNavigate } from "react-router-dom";

const UserMessages = () => {
  const { token, user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const merchantIdFromQuery = searchParams.get('merchantId');
  const merchantNameFromQuery = searchParams.get('merchantName');
  
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const initializedRef = useRef(false);

  // Initialize socket connection
  useEffect(() => {
    socketRef.current = io(API_BASE, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    // Join user's personal room for notifications
    if (user?.userId) {
      socketRef.current.emit('joinUserRoom', user.userId);
    }

    // Listen for new message events
    socketRef.current.on('newMessage', (message) => {
      // Add new message to current chat if open
      if (selectedChat && selectedChat.chatId === message.chatId) {
        setMessages((prev) => [...prev, message]);
      }
      
      // Update chat list and badge count
      setChats((prev) => {
        const existingChatIndex = prev.findIndex(c => c.chatId === message.chatId);
        if (existingChatIndex > -1) {
          const updatedChats = [...prev];
          updatedChats[existingChatIndex] = {
            ...updatedChats[existingChatIndex],
            lastMessage: message,
            unreadCount: message.receiverId._id === user.userId ? (updatedChats[existingChatIndex].unreadCount || 0) + 1 : updatedChats[existingChatIndex].unreadCount
          };
          return [updatedChats[existingChatIndex], ...prev.filter((_, i) => i !== existingChatIndex)];
        }
        return prev;
      });
      
      // Increment badge count if not in current chat
      if (!selectedChat || selectedChat.chatId !== message.chatId) {
        // Badge will be updated via sidebar polling
      }
    });

    // Listen for notification badge updates
    socketRef.current.on('notificationBadge', (data) => {
      console.log('Notification badge update:', data);
      // Reload unread count
      loadUnreadCount();
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [selectedChat, user.userId]);

  // Fetch chats on load
  useEffect(() => {
    fetchChats();
  }, []);

  // Handle merchant chat initiation from query params
  useEffect(() => {
    if (merchantIdFromQuery && !initializedRef.current) {
      initializedRef.current = true;
      
      // Check if we already have a chat with this merchant
      const existingChat = chats.find(chat => chat.otherUser._id === merchantIdFromQuery);
      
      if (existingChat) {
        // Chat exists, select it
        setSelectedChat(existingChat);
      } else {
        // No existing chat, create one
        startNewChat(merchantIdFromQuery);
      }
    }
  }, [merchantIdFromQuery, chats]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Join chat room when chat is selected
  useEffect(() => {
    if (selectedChat && socketRef.current) {
      socketRef.current.emit('joinChat', selectedChat.chatId);
      fetchMessages(selectedChat.chatId);
      
      // Mark messages as read when opening chat
      markMessagesAsRead(selectedChat.chatId);
    }
    
    return () => {
      if (selectedChat && socketRef.current) {
        socketRef.current.emit('leaveChat', selectedChat.chatId);
      }
    };
  }, [selectedChat]);

  const fetchChats = async () => {
    try {
      const response = await axios.get(`${API_BASE}/message/chats`, {
        headers: authHeaders(token)
      });
      
      if (response.data.success) {
        setChats(response.data.chats);
      }
    } catch (error) {
      console.error("Error fetching chats:", error);
      toast.error("Failed to load chats");
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await axios.get(`${API_BASE}/message/unread-count`, {
        headers: authHeaders(token)
      });
      
      if (response.data.success) {
        // Badge is managed in sidebar, but we can log it
        console.log('Unread messages:', response.data.count);
      }
    } catch (error) {
      console.error("Error loading unread count:", error);
    }
  };

  const markMessagesAsRead = async (chatId) => {
    try {
      await axios.put(
        `${API_BASE}/message/mark-as-read`,
        { chatId },
        {
          headers: authHeaders(token)
        }
      );
      
      // Update local state to remove unread badge from this chat
      setChats((prev) => 
        prev.map((chat) => 
          chat.chatId === chatId ? { ...chat, unreadCount: 0 } : chat
        )
      );
      
      // Reload unread count
      loadUnreadCount();
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const startNewChat = async (merchantId) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE}/message/find-or-create`, {
        merchantId
      }, {
        headers: authHeaders(token)
      });

      if (response.data.success) {
        const { chatId } = response.data;
        
        // Show success message
        toast.success(`Starting conversation with ${merchantNameFromQuery || 'merchant'}`);
        
        // Create a temporary chat object to select immediately
        const tempChat = {
          chatId,
          otherUser: {
            _id: merchantId,
            name: merchantNameFromQuery || 'Merchant',
            email: '',
            profileImage: null
          },
          lastMessage: null,
          unreadCount: 0
        };
        
        // Select the chat immediately
        setSelectedChat(tempChat);
        
        // Refresh chats in background to get the actual data
        await fetchChats();
      }
    } catch (error) {
      console.error("Error starting chat:", error);
      toast.error(error.response?.data?.message || "Failed to start chat");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (chatId) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/message/messages/${chatId}`, {
        headers: authHeaders(token)
      });
      
      if (response.data.success) {
        console.log('=== FETCHED MESSAGES ===');
        console.log('User ID from context:', user.userId);
        console.log('First message structure:', response.data.messages[0]);
        console.log('Current user check:', response.data.messages[0]?.senderId);
        
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    try {
      const response = await axios.post(`${API_BASE}/message/send`, {
        receiverId: selectedChat.otherUser._id,
        content: newMessage.trim()
      }, {
        headers: authHeaders(token)
      });

      if (response.data.success) {
        setNewMessage("");
        // Message will be added via socket event
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  };

  const filteredChats = chats.filter(chat => 
    chat.otherUser?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <UserLayout>
      <div style={{ height: "calc(100vh - 80px)", display: "flex", background: "#f0f2f5", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.08)" }}>

        {/* ── Left: Chat List ── */}
        <div style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", background: "#fff", borderRight: "1px solid #e5e7eb" }}>
          <div style={{ padding: "16px", borderBottom: "1px solid #e5e7eb", background: "#f8fafc" }}>
            <h2 style={{ color: "#111827", fontWeight: 700, fontSize: 18, marginBottom: 10 }}>Messages</h2>
            <div style={{ position: "relative" }}>
              <FaSearch style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#aaa", fontSize: 13 }} />
              <input type="text" placeholder="Search chats..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, borderRadius: 20, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, outline: "none" }} />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filteredChats.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
                <p>No chats yet</p>
                <p style={{ marginTop: 6, fontSize: 12 }}>Start a conversation with a merchant!</p>
              </div>
            ) : filteredChats.map((chat) => (
              <div key={chat.chatId} onClick={() => setSelectedChat(chat)}
                style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", background: selectedChat?.chatId === chat.chatId ? "#e7f3ef" : "#fff", display: "flex", alignItems: "center", gap: 12, transition: "background 0.15s" }}
                onMouseEnter={e => { if (selectedChat?.chatId !== chat.chatId) e.currentTarget.style.background = "#f9fafb"; }}
                onMouseLeave={e => { if (selectedChat?.chatId !== chat.chatId) e.currentTarget.style.background = "#fff"; }}>
                <img src={chat.otherUser?.profileImage || `https://ui-avatars.com/api/?name=${chat.otherUser?.name}&background=random`}
                  alt={chat.otherUser?.name} style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{chat.otherUser?.name}</span>
                    {chat.unreadCount > 0 && (
                      <span style={{ background: "#25d366", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 20 }}>{chat.unreadCount}</span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{chat.lastMessage?.content || "No messages yet"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Conversation ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {selectedChat ? (
            <>
              {/* Header */}
              <div style={{ padding: "10px 16px", background: "#fff", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 12 }}>
                <img src={selectedChat.otherUser?.profileImage || `https://ui-avatars.com/api/?name=${selectedChat.otherUser?.name}&background=random`}
                  alt={selectedChat.otherUser?.name} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
                <div>
                  <p style={{ fontWeight: 700, color: "#111827", fontSize: 15 }}>{selectedChat.otherUser?.name}</p>
                  <p style={{ fontSize: 12, color: "#6b7280" }}>{selectedChat.otherUser?.email}</p>
                </div>
              </div>

              {/* Messages area */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 12px", background: "#f8fafc", display: "flex", flexDirection: "column", gap: 4 }}>
                {loading ? (
                  <div style={{ textAlign: "center", color: "#6b7280", paddingTop: 40 }}>Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#6b7280", paddingTop: 40 }}>
                    <p>No messages yet</p>
                    <p style={{ fontSize: 13, marginTop: 6 }}>Say hello to start the conversation!</p>
                  </div>
                ) : messages.map((msg, index) => {
                  const senderId = msg.senderId?._id || msg.senderId;
                  const currentUserId = user?.id || user?._id || user?.userId;
                  const isMe = String(senderId) === String(currentUserId);

                  // Date separator logic
                  const msgDate = new Date(msg.createdAt);
                  const prevMsg = messages[index - 1];
                  const prevDate = prevMsg ? new Date(prevMsg.createdAt) : null;
                  const showDateSep = !prevDate || msgDate.toDateString() !== prevDate.toDateString();
                  const today = new Date();
                  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
                  const dateLabel = msgDate.toDateString() === today.toDateString() ? "Today"
                    : msgDate.toDateString() === yesterday.toDateString() ? "Yesterday"
                    : msgDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

                  return (
                    <div key={msg._id}>
                      {showDateSep && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", margin: "12px 0 8px" }}>
                          <span style={{ background: "#e2e8f0", color: "#475569", fontSize: 11, fontWeight: 600, padding: "3px 12px", borderRadius: 20 }}>
                            {dateLabel}
                          </span>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: 2 }}>
                        <div style={{
                          maxWidth: "65%", padding: "8px 12px 6px",
                          borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                          background: isMe ? "#dbeafe" : "#fff",
                          boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
                          border: isMe ? "1px solid #bfdbfe" : "1px solid #d1d5db",
                        }}>
                          <p style={{ fontSize: 14, color: "#111827", lineHeight: 1.5, wordBreak: "break-word", margin: 0 }}>{msg.content}</p>
                          <p style={{ fontSize: 11, color: isMe ? "#1d4ed8" : "#4b5563", textAlign: "right", marginTop: 4, marginBottom: 0, fontWeight: 500 }}>
                            {msgDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {isMe && <span style={{ marginLeft: 4 }}>✓✓</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={sendMessage} style={{ padding: "10px 12px", background: "#fff", display: "flex", alignItems: "center", gap: 10, borderTop: "1px solid #e5e7eb" }}>
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  style={{ flex: 1, padding: "10px 16px", borderRadius: 24, border: "1px solid #e5e7eb", background: "#f8fafc", fontSize: 14, outline: "none" }} />
                <button type="submit" disabled={!newMessage.trim()}
                  style={{ width: 44, height: 44, borderRadius: "50%", background: newMessage.trim() ? "#2563eb" : "#ccc", border: "none", cursor: newMessage.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s" }}>
                  <FaPaperPlane style={{ color: "#fff", fontSize: 16 }} />
                </button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f0f2f5", color: "#9ca3af" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
              <p style={{ fontSize: 18, fontWeight: 600, color: "#374151" }}>Select a chat</p>
              <p style={{ fontSize: 14, marginTop: 6 }}>Choose a conversation from the left to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
};

export default UserMessages;
