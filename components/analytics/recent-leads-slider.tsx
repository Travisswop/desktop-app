"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  CarouselApi,
} from "@/components/ui/carousel";
import { Phone, Mail } from "lucide-react";

interface Lead {
  _id: string;
  name: string;
  micrositeId: string;
  jobTitle: string;
  email: string;
  mobileNo: string;
}

interface SmarsiteLeads {
  id: string;
  name: string;
  leads: Lead[];
}

export default function RecentLeadsSlider({
  leads,
  microsites,
}: {
  leads: any[];
  microsites: any[];
}) {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const formattedLeads = React.useMemo(() => {
    if (!microsites || !leads) return [];

    return microsites.map((microsite) => ({
      id: microsite._id,
      name: microsite.name,
      leads: leads.filter((lead) => lead.micrositeId === microsite._id),
    }));
  }, [microsites, leads]);

  return (
    <div>
      <Carousel
        setApi={setApi}
        className="w-full"
        opts={{
          align: "start",
        }}
      >
        <CarouselContent>
          {formattedLeads.map((lead) => (
            <CarouselItem key={lead.id}>
              <Card className="mx-8">
                <CardContent className="p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold">{lead.name}</h3>
                  </div>
                  {lead.leads.length > 0 ? (
                    <>
                      {lead.leads.map((item: Lead) => (
                        <div key={item._id} className="border-t py-4">
                          <div className="flex justify-between items-center">
                            <div className="space-y-3">
                              <div>
                                <h4 className="font-semibold">{item.name}</h4>
                                <p className="text-muted-foreground">
                                  {item.jobTitle}
                                </p>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Phone className="h-4 w-4" />
                                  <span>{item.mobileNo}</span>
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
                    </>
                  ) : (
                    <p className="text-gray-600 font-medium text-sm">
                      No Leads Available!
                    </p>
                  )}
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="absolute left-3 -translate-x-1/2" />
        <CarouselNext className="absolute right-3 translate-x-1/2" />
      </Carousel>

      <div className="flex justify-center gap-2 mt-4">
        {Array.from({ length: count }).map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === current ? "bg-primary" : "bg-gray-200"
            }`}
            onClick={() => api?.scrollTo(index)}
          />
        ))}
      </div>
    </div>
  );
}
