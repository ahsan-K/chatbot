import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { MediaPicker } from './media-picker';
import { ChatMedia, QuickReply } from './types';

const QUICK_REPLIES: QuickReply[] = [
  { id: '1', emoji: '🤔', label: 'What can you do?' },
  { id: '2', emoji: '💰', label: 'Pricing' },
  { id: '3', emoji: '🙋‍♂️', label: 'FAQs' },
];

type Props = {
  onSend: (text: string) => void;
  onSendMedia: (media: ChatMedia) => void;
  onQuickReply: (reply: QuickReply) => void;
  showQuickReplies?: boolean;
  onTypingChange?: (isTyping: boolean) => void;
};

export function ChatFooter({ onSend, onSendMedia, onQuickReply, showQuickReplies = true, onTypingChange }: Props) {
  const [text, setText] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  }

  function handleMediaSelected(media: ChatMedia) {
    onSendMedia(media);
    setPickerVisible(false);
  }

  return (
    <View style={styles.container}>
      {showQuickReplies && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagsRow}>
          {QUICK_REPLIES.map((reply) => (
            <TouchableOpacity
              key={reply.id}
              style={styles.tag}
              onPress={() => onQuickReply(reply)}
              activeOpacity={0.7}>
              <Text style={styles.tagText}>
                {reply.emoji} {reply.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.inputRow}>
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={() => setPickerVisible(true)}
          activeOpacity={0.7}>
          <Text style={styles.attachIcon}>＋</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          value={text}
          onChangeText={(val) => {
            setText(val);
            if (onTypingChange) {
              onTypingChange(true);
              if (typingTimer.current) clearTimeout(typingTimer.current);
              typingTimer.current = setTimeout(() => onTypingChange(false), 2000);
            }
          }}
          placeholder="Type your message here..."
          placeholderTextColor="#9aa0aa"
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />

        <TouchableOpacity
          onPress={handleSend}
          activeOpacity={0.7}
          hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
          style={styles.sendBtn}>
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>

      <MediaPicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onMediaSelected={handleMediaSelected}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  tag: {
    backgroundColor: '#f3f5f6',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 0,
    elevation: 1,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444444',
  },
  inputRow: {
    backgroundColor: '#e8ebf0',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f5f6',
  },
  attachBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#4361EE',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  attachIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '300',
    marginTop: -1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#444444',
    padding: 0,
    margin: 0,
    outlineWidth: 0,
  } as any,
  sendBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    fontSize: 18,
    color: '#4361EE',
  },
});
