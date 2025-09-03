import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { Send, LogOut, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const Chat = () => {
  const { profile, signOut } = useAuth();
  const {
    users,
    conversations,
    messages,
    activeConversation,
    loading,
    sendMessage,
    startChatWithUser,
    setActiveConversation,
    fetchMessages
  } = useChat();
  
  const [newMessage, setNewMessage] = useState('');
  const [showUserList, setShowUserList] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation || !newMessage.trim()) return;

    await sendMessage(activeConversation, newMessage);
    setNewMessage('');
  };

  const handleStartChat = async (userId: string) => {
    await startChatWithUser(userId);
    setShowUserList(false);
  };

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversation(conversationId);
    fetchMessages(conversationId);
  };

  const activeConversationData = conversations.find(c => c.id === activeConversation);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {profile?.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{profile?.display_name || profile?.username}</p>
                <p className="text-sm text-muted-foreground">@{profile?.username}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowUserList(!showUserList)}
              >
                <Users className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* User List or Conversations */}
        <ScrollArea className="flex-1">
          {showUserList ? (
            <div className="p-4">
              <h3 className="font-medium mb-3">Start a conversation</h3>
              <div className="space-y-2">
                {users.map((user) => (
                  <Button
                    key={user.id}
                    variant="ghost"
                    className="w-full justify-start p-3 h-auto"
                    onClick={() => handleStartChat(user.user_id)}
                  >
                    <Avatar className="h-8 w-8 mr-3">
                      <AvatarFallback>
                        {user.username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="font-medium">{user.display_name || user.username}</p>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4">
              <h3 className="font-medium mb-3">Conversations</h3>
              <div className="space-y-2">
                {conversations.map((conversation) => (
                  <Button
                    key={conversation.id}
                    variant={activeConversation === conversation.id ? "secondary" : "ghost"}
                    className="w-full justify-start p-3 h-auto"
                    onClick={() => handleSelectConversation(conversation.id)}
                  >
                    <Avatar className="h-8 w-8 mr-3">
                      <AvatarFallback>
                        {conversation.other_user?.username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {conversation.other_user?.display_name || conversation.other_user?.username}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        @{conversation.other_user?.username}
                      </p>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {activeConversationData?.other_user?.username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {activeConversationData?.other_user?.display_name || 
                     activeConversationData?.other_user?.username}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    @{activeConversationData?.other_user?.username}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender_id === profile?.user_id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-3 py-2 ${
                        message.sender_id === profile?.user_id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-border">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <Card className="w-96 text-center">
              <CardHeader>
                <CardTitle>Welcome to Chat</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Select a conversation or start a new one to begin messaging.
                </p>
                <Button onClick={() => setShowUserList(true)}>
                  <Users className="h-4 w-4 mr-2" />
                  Find Users to Chat
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;