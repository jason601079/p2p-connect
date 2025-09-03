import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Profile {
  id: string;
  user_id: string;
  username: string;
  display_name?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: Profile;
}

interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  updated_at: string;
  other_user?: Profile;
  last_message?: Message;
}

export const useChat = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch all users
  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('user_id', user?.id || '');
    setUsers(data || []);
  };

  // Fetch conversations
  const fetchConversations = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('updated_at', { ascending: false });

    if (data) {
      // Fetch profiles for other users
      const otherUserIds = data.map(conv => 
        conv.user1_id === user.id ? conv.user2_id : conv.user1_id
      );

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', otherUserIds);

      const conversationsWithOtherUser = data.map(conv => {
        const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
        const otherUser = profiles?.find(p => p.user_id === otherUserId);
        return {
          ...conv,
          other_user: otherUser
        };
      });

      setConversations(conversationsWithOtherUser);
    }
  };

  // Fetch messages for a conversation
  const fetchMessages = async (conversationId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (data) {
      // Fetch sender profiles
      const senderIds = [...new Set(data.map(msg => msg.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', senderIds);

      const messagesWithSender = data.map(msg => ({
        ...msg,
        sender: profiles?.find(p => p.user_id === msg.sender_id)
      }));

      setMessages(messagesWithSender);
    }
    setLoading(false);
  };

  // Find or create conversation with a user
  const getOrCreateConversation = async (otherUserId: string) => {
    if (!user) return null;

    // Check if conversation already exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${user.id})`)
      .single();

    if (existing) {
      return existing.id;
    }

    // Create new conversation
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        user1_id: user.id,
        user2_id: otherUserId
      })
      .select()
      .single();

    if (newConv) {
      fetchConversations();
      return newConv.id;
    }

    return null;
  };

  // Send a message
  const sendMessage = async (conversationId: string, content: string) => {
    if (!user || !content.trim()) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim()
      });

    if (!error) {
      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    }
  };

  // Start chat with user
  const startChatWithUser = async (userId: string) => {
    const conversationId = await getOrCreateConversation(userId);
    if (conversationId) {
      setActiveConversation(conversationId);
      fetchMessages(conversationId);
    }
  };

  // Set up real-time messaging
  useEffect(() => {
    if (!activeConversation) return;

    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversation}`
        },
        async (payload) => {
          // Fetch the sender profile for the new message
          const { data: senderData } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', payload.new.sender_id)
            .single();

          const newMessage: Message = {
            id: payload.new.id,
            conversation_id: payload.new.conversation_id,
            sender_id: payload.new.sender_id,
            content: payload.new.content,
            created_at: payload.new.created_at,
            sender: senderData
          };

          setMessages(current => [...current, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversation]);

  useEffect(() => {
    if (user) {
      fetchUsers();
      fetchConversations();
    }
  }, [user]);

  return {
    users,
    conversations,
    messages,
    activeConversation,
    loading,
    fetchUsers,
    fetchConversations,
    fetchMessages,
    sendMessage,
    startChatWithUser,
    setActiveConversation
  };
};