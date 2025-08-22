import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export default function ChatbotNewPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: "Hello! 👋 I'm here to guide you through your recovery. What's bothering you today?",
      sender: 'bot',
      timestamp: new Date()
    },
    {
      id: '2',
      content: "My knee feels a bit tight when I bend it during the heel slides. Should I stop?",
      sender: 'user',
      timestamp: new Date()
    },
    {
      id: '3',
      content: "A little tightness is okay — your knee is still healing. But don't push into sharp pain. Here's how you can ease into movement today:\n • Use a towel under your heel to help guide the slide\n • Warm up first with 10 ankle pumps\n • Only bend to the range that feels mildly tight, not painful\n\nWould you like me to adjust your reps or suggest a warm-up video?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getBotResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    if (message.includes('pain') || message.includes('hurt')) {
      return "I understand you're experiencing pain. Can you rate it on a scale of 1-10? If it's severe (7+), please contact your physiotherapist immediately. For mild discomfort, try gentle stretching and ice application.";
    }
    
    if (message.includes('exercise') || message.includes('workout')) {
      return "For your knee recovery, focus on gentle exercises like heel slides, quad sets, and ankle pumps. Always stop if you feel sharp pain. Would you like me to guide you through any specific exercise?";
    }
    
    if (message.includes('tight') || message.includes('stiff')) {
      return "A little tightness is okay — your knee is still healing. But don't push into sharp pain. Here's how you can ease into movement today:\n • Use a towel under your heel to help guide the slide\n • Warm up first with 10 ankle pumps\n • Only bend to the range that feels mildly tight, not painful\n\nWould you like me to adjust your reps or suggest a warm-up video?";
    }
    
    if (message.includes('swelling') || message.includes('swollen')) {
      return "Swelling is common after knee surgery. Elevate your leg above heart level, apply ice for 15-20 minutes, and avoid standing for long periods. Contact your doctor if swelling increases significantly.";
    }
    
    if (message.includes('when') || message.includes('how long')) {
      return "Recovery timelines vary by individual and injury type. Generally, Phase 1 (weeks 1-2) focuses on pain control, Phase 2 (weeks 3-6) on mobility, and Phase 3 (weeks 6+) on strengthening. Follow your personalized plan!";
    }
    
    if (message.includes('stop') || message.includes('should i')) {
      return "Listen to your body! Stop if you experience sharp pain, increased swelling, or feeling unwell. Mild discomfort is normal, but pain isn't. When in doubt, it's always best to pause and consult your physiotherapist.";
    }
    
    if (message.includes('help') || message.includes('support')) {
      return "I'm here to support you! I can help with exercise guidance, pain management tips, and general recovery questions. For urgent concerns or detailed medical advice, please contact your healthcare team directly.";
    }
    
    // Default responses
    const defaultResponses = [
      "That's a great question! For specific medical concerns, I recommend discussing with your physiotherapist. In the meantime, focus on your prescribed exercises and listen to your body.",
      "I understand your concern. Recovery can be challenging, but you're doing great! Make sure to follow your exercise plan and don't hesitate to reach out to your healthcare team if needed.",
      "Thank you for sharing that with me. Remember that healing takes time, and every small step counts towards your recovery. Keep up the good work!"
    ];
    
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate bot typing delay
    setTimeout(() => {
      const botResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: getBotResponse(inputMessage),
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const renderMessage = (message: ChatMessage, index: number) => {
    const isBot = message.sender === 'bot';
    
    return (
      <View key={message.id} style={[styles.messageContainer, isBot ? styles.botMessage : styles.userMessage]}>
        <View style={[styles.messageBubble, isBot ? styles.botBubble : styles.userBubble]}>
          <Text style={[styles.messageText, isBot ? styles.botText : styles.userText]}>
            {message.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Physio Buddy</Text>
            <Text style={styles.subtitle}>Chat bot</Text>
            <Text style={styles.subtitle}>Conversations</Text>
          </View>
          
          {/* Robot Character */}
          <View style={styles.robotContainer}>
            <View style={styles.robotCircle}>
              <Text style={styles.robotEmoji}>🤖</Text>
            </View>
          </View>
        </View>

        {/* Messages */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message, index) => renderMessage(message, index))}
          
          {isTyping && (
            <View style={[styles.messageContainer, styles.botMessage]}>
              <View style={[styles.messageBubble, styles.botBubble]}>
                <View style={styles.typingIndicator}>
                  <View style={[styles.typingDot, { animationDelay: 0 }]} />
                  <View style={[styles.typingDot, { animationDelay: 100 }]} />
                  <View style={[styles.typingDot, { animationDelay: 200 }]} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Section */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={inputMessage}
              onChangeText={setInputMessage}
              placeholder="Send message"
              placeholderTextColor="rgba(0,0,0,0.6)"
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputMessage.trim() || isTyping) && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!inputMessage.trim() || isTyping}
            >
              <Text style={styles.sendButtonText}>→</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    height: 200,
    paddingHorizontal: 16,
    paddingTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerContent: {
    flex: 1,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7c6bc5',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7c6bc5',
    marginBottom: 2,
  },
  robotContainer: {
    marginTop: 20,
  },
  robotCircle: {
    width: 120,
    height: 120,
    backgroundColor: '#DCD6F7',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  robotEmoji: {
    fontSize: 60,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 8,
  },
  messagesContent: {
    paddingBottom: 20,
  },
  messageContainer: {
    marginBottom: 16,
  },
  botMessage: {
    alignItems: 'flex-start',
    paddingLeft: 8,
    paddingRight: 60,
  },
  userMessage: {
    alignItems: 'flex-end',
    paddingLeft: 60,
    paddingRight: 8,
  },
  messageBubble: {
    borderRadius: 10,
    padding: 16,
    maxWidth: '100%',
  },
  botBubble: {
    backgroundColor: '#f5f1ed',
  },
  userBubble: {
    backgroundColor: '#DCD6F7',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  botText: {
    color: '#000000',
  },
  userText: {
    color: '#000000',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#666666',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(190,181,228,0.72)',
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 43,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: 'rgba(0,0,0,0.8)',
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 18,
    color: 'rgba(0,0,0,0.6)',
    fontWeight: 'bold',
  },
});