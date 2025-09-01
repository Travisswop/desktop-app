import React, { useState } from 'react';
import { 
  Heart, 
  Edit, 
  Trash2, 
  Forward, 
  MessageCircle, 
  Pin, 
  Search,
  Eye,
  Clock,
  Hash,
  AtSign,
  Link,
  FileImage,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export const EnhancedFeaturesPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const features = [
    {
      icon: <Heart className="w-4 h-4" />,
      title: "Emoji Reactions",
      description: "Click the emoji buttons below messages or add custom reactions",
      example: "❤️ 👍 😊 😂"
    },
    {
      icon: <Edit className="w-4 h-4" />,
      title: "Edit Messages", 
      description: "Edit your own messages with full history tracking",
      example: "Click ⋯ menu → Edit"
    },
    {
      icon: <Trash2 className="w-4 h-4" />,
      title: "Delete Messages",
      description: "Delete for yourself or for everyone (if you sent it)",
      example: "Click ⋯ menu → Delete options"
    },
    {
      icon: <MessageCircle className="w-4 h-4" />,
      title: "Reply & Threading",
      description: "Reply to specific messages to create conversation threads",
      example: "Click Reply button on any message"
    },
    {
      icon: <Forward className="w-4 h-4" />,
      title: "Forward Messages",
      description: "Share messages to other conversations",
      example: "Click ⋯ menu → Forward"
    },
    {
      icon: <Pin className="w-4 h-4" />,
      title: "Pin Important Messages",
      description: "Pin messages to keep them visible",
      example: "📌 indicator for pinned messages"
    },
    {
      icon: <Eye className="w-4 h-4" />,
      title: "Read Receipts",
      description: "See when messages are delivered and read",
      example: "✓ sent, ✓✓ delivered, ✓✓ read"
    },
    {
      icon: <Clock className="w-4 h-4" />,
      title: "Message Status",
      description: "Real-time status updates for all messages",
      example: "⏳ sending → ✓ sent → ✓✓ delivered"
    },
    {
      icon: <AtSign className="w-4 h-4" />,
      title: "Mentions",
      description: "Type @username to mention users in messages",
      example: "Mentions: @alice @bob.eth"
    },
    {
      icon: <Hash className="w-4 h-4" />,
      title: "Hashtags",
      description: "Use #hashtags to categorize messages",
      example: "#crypto #trading #defi"
    },
    {
      icon: <Link className="w-4 h-4" />,
      title: "Link Previews",
      description: "Automatic preview cards for shared links",
      example: "Rich previews with titles and descriptions"
    },
    {
      icon: <FileImage className="w-4 h-4" />,
      title: "Enhanced Attachments",
      description: "Rich metadata for files, images, audio, and video",
      example: "📎 filename.pdf (245KB)"
    },
    {
      icon: <Search className="w-4 h-4" />,
      title: "Message Search",
      description: "Search through conversation history",
      example: "Coming soon in context menu"
    }
  ];

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            <CardTitle className="text-lg">Enhanced Chat Features</CardTitle>
          </div>
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>
        <CardDescription>
          Your chat now includes modern messaging features! Try them out in your conversations.
        </CardDescription>
      </CardHeader>
      
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="grid gap-3">
              {features.map((feature, index) => (
                <div key={index} className="flex gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex-shrink-0 mt-0.5 text-blue-600 dark:text-blue-400">
                    {feature.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                      {feature.title}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {feature.description}
                    </p>
                    {feature.example && (
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-mono">
                        {feature.example}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium text-sm text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                What's New
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                This chat system now rivals modern apps like WhatsApp, Telegram, and Discord with enterprise-grade features while maintaining full Web3 compatibility.
              </p>
            </div>
            
            <div className="mt-3 text-xs text-gray-500 text-center">
              All features are backward compatible with existing conversations
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};