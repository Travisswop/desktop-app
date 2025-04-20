import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MessageCircle, Search } from 'lucide-react';
import { Input } from '../ui/input';

export default function MessageBox() {
  return (
    <Card className="w-full border-none rounded-xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <h3 className="font-bold text-xl text-gray-700">
            Messages
          </h3>
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
          <p className="text-center text-gray-500">
            No messages found.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
