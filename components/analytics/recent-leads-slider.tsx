'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  CarouselApi,
} from '@/components/ui/carousel';
import { Phone, Mail } from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  title: string;
  phone: string;
  email: string;
}

interface SmarsiteLeads {
  id: string;
  name: string;
  leads: Lead[];
}

const leads: Lead[] = [
  {
    id: '1',
    name: 'Jakob Rhiel Madsen',
    title: 'Marketing Officer',
    phone: '(336567-6403)',
    email: 'jakobrhiel@gmail.com',
  },
  {
    id: '2',
    name: 'Jakob Rhiel Madsen',
    title: 'Marketing Officer',
    phone: '(336567-6403)',
    email: 'jakobrhiel@gmail.com',
  },
  {
    id: '3',
    name: 'Jakob Rhiel Madsen',
    title: 'Marketing Officer',
    phone: '(336567-6403)',
    email: 'jakobrhiel@gmail.com',
  },
];

const smarSiteLeads: SmarsiteLeads[] = [
  {
    id: 'travis',
    name: 'Travis Herron',
    leads: leads,
  },
  {
    id: 'rakib',
    name: 'Rakibul Islam',
    leads: leads,
  },
];

export default function RecentLeadsSlider() {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  return (
    <div>
      <Carousel
        setApi={setApi}
        className="w-full"
        opts={{
          align: 'start',
        }}
      >
        <CarouselContent>
          {smarSiteLeads.map((lead) => (
            <CarouselItem key={lead.id}>
              <Card>
                <CardContent className="p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold">
                      {lead.name}
                    </h3>
                  </div>
                  {lead.leads.map((item) => (
                    <div key={item.id} className="border-t py-4">
                      <div className="flex justify-between items-center">
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-semibold">
                              {item.name}
                            </h4>
                            <p className="text-muted-foreground">
                              {item.title}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              <span>{item.phone}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="h-4 w-4" />
                              <span>{item.email}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <Phone className="h-4 w-4" />
                          Contact Lead
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="absolute left-0 -translate-x-1/2" />
        <CarouselNext className="absolute right-0 translate-x-1/2" />
      </Carousel>

      <div className="flex justify-center gap-2 mt-4">
        {Array.from({ length: count }).map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === current ? 'bg-primary' : 'bg-gray-200'
            }`}
            onClick={() => api?.scrollTo(index)}
          />
        ))}
      </div>
    </div>
  );
}
