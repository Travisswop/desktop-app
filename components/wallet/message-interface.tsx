import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Search } from "lucide-react";
import Image from "next/image";
import { Input } from "../ui/input";
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
      id: "1",
      name: "Sadit Ahsan",
      role: "Graphics Designer",
      newMessages: 1,
      avatar: `/assets/images/sadit.png?height=32&width=32`,
      onView: () => console.log("View message"),
    },
  ];

  return (
    <Card className="w-full border-none rounded-xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <h3 className="font-bold text-xl text-gray-700">Messages</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Chat with your connection.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center mb-6">
          <Input
            type="text"
            placeholder="Search messages..."
            className="border rounded-e-none  p-2 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button
            variant="black"
            size="icon"
            className="rounded-s-none px-6 font-bold"
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>
        <div className="space-y-3">
          <p className="text-center text-gray-500">No messages found.</p>
        </div>
      </CardContent>
    </Card>
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
                {newMessages !== 1 ? "s" : ""}
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
