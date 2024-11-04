import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Search } from 'lucide-react';
import Image from 'next/image';
import avatar from '../../assets/images/sadit.png';
interface MessageProps {
  id: string;
  name: string;
  role: string;
  newMessages: number;
  avatar: string;
  onView?: () => void;
}

export default function MessageBox() {
  const messages: MessageProps[] = [
    {
      id: '1',
      name: 'Sadit Ahsan',
      role: 'Graphics Designer',
      newMessages: 1,
      avatar: `${avatar.src}?height=40&width=40`,
      onView: () => console.log('View message'),
    },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto p-4 bg-white rounded-xl ">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          Messages
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground"
        >
          <Search className="h-5 w-5" />
        </Button>
      </div>

      <div className="space-y-3">
        {messages.map((message) => (
          <MessageCard key={message.id} {...message} />
        ))}
      </div>
    </div>
  );
}

function MessageCard({
  name,
  role,
  newMessages,
  avatar,
  onView,
}: MessageProps) {
  return (
    <Card className="p-4 rounded-xl shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative h-10 w-10">
            <Image
              src={avatar}
              alt={name}
              className="rounded-full"
              fill
              sizes="40px"
            />
          </div>
          <div>
            <h3 className="font-semibold">{name}</h3>
            <p className=" text-xs text-muted-foreground">{role}</p>
            {newMessages > 0 && (
              <p className="text-sm text-purple-400">
                {newMessages} New Message
                {newMessages !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onView}
          className="bg-gray-100 hover:bg-gray-200 font-semibold"
        >
          View
        </Button>
      </div>
    </Card>
  );
}
