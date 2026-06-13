"use client";

import { getCountries, getCountryCallingCode } from "react-phone-number-input";
import type { Country } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import en from "react-phone-number-input/locale/en.json";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  value?: Country;
  onChange: (value?: Country) => void;
}

export default function CountrySelect({ value, onChange }: Props) {
  const countries = getCountries();

  return (
    <Select
      value={value}
      onValueChange={(val) => onChange((val as Country) || undefined)}
    >
      <SelectTrigger className="h-9 w-fit gap-2 border-transparent px-2 focus:ring-white">
        <SelectValue placeholder="Country" asChild>
          {value ? (
            <div className="flex items-center gap-2">
              {(() => {
                const Flag = flags[value];
                return Flag ? (
                  <span className="h-4 w-5 overflow-hidden">
                    <Flag title={en[value]} />
                  </span>
                ) : null;
              })()}
              <span className="text-sm">+{getCountryCallingCode(value)}</span>
            </div>
          ) : (
            <span>Country</span>
          )}
        </SelectValue>
      </SelectTrigger>

      <SelectContent className="max-h-72">
        {countries.map((country) => {
          const Flag = flags[country];

          return (
            <SelectItem
              key={country}
              value={country}
              className="flex items-center gap-3"
            >
              <div className="flex items-center gap-3">
                {Flag && (
                  <span className="h-4 w-5 overflow-hidden">
                    <Flag title={en[country]} />
                  </span>
                )}
                <span className="flex-1 text-sm">{en[country]}</span>
                <span className="text-muted-foreground text-xs">
                  +{getCountryCallingCode(country)}
                </span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
