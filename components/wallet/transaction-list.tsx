import { Card } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Transaction {
  id: string;
  hash: string;
  date: string;
  amount: number;
  usdAmount: number;
  type: 'send' | 'receive';
  badge: string;
}

const transactions: Transaction[] = [
  {
    id: '1',
    hash: '0x3rf....56hgj',
    date: 'Jun 22, 2021',
    amount: 582.38,
    usdAmount: 8735.79,
    type: 'receive',
    badge: 'E',
  },
  {
    id: '2',
    hash: '0x67h....65ryt',
    date: 'Jun 20, 2021',
    amount: 139.65,
    usdAmount: 4580.36,
    type: 'send',
    badge: 'S',
  },
  {
    id: '3',
    hash: '0x3rf....dffg5',
    date: 'Jun 19, 2021',
    amount: 168.26,
    usdAmount: 4256.98,
    type: 'receive',
    badge: 'M',
  },
  {
    id: '4',
    hash: '0x3rf....56hgj',
    date: 'Jun 17, 2021',
    amount: 9.12,
    usdAmount: 3915.75,
    type: 'send',
    badge: 'S',
  },
  {
    id: '5',
    hash: '0x4gd....fg67j',
    date: 'Jun 16, 2021',
    amount: 43790.89,
    usdAmount: 43795.67,
    type: 'receive',
    badge: 'S',
  },
];

export default function TransactionList() {
  return (
    <div className="w-full max-w-3xl mx-auto p-4 bg-white mt-6 rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          Transactions
        </h2>
        <Button variant="ghost" size="icon">
          <Search className="h-5 w-5 text-muted-foreground" />
        </Button>
      </div>

      <div className="space-y-3">
        {transactions.map((transaction) => (
          <TransactionItem
            key={transaction.id}
            transaction={transaction}
          />
        ))}
      </div>
    </div>
  );
}

function TransactionItem({
  transaction,
}: {
  transaction: Transaction;
}) {
  return (
    <Card className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            {transaction.type === 'send' ? (
              <ArrowUpRight className="w-5 h-5 text-blue-600" />
            ) : (
              <ArrowDownRight className="w-5 h-5 text-blue-600" />
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-medium">
            {transaction.badge}
          </div>
        </div>
        <div>
          <p className="font-medium">{transaction.hash}</p>
          <p className="text-sm text-muted-foreground">
            {transaction.date}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-medium">
          {transaction.amount.toLocaleString()}
        </p>
        <p className="text-sm text-muted-foreground">
          ${transaction.usdAmount.toLocaleString()}
        </p>
      </div>
    </Card>
  );
}
