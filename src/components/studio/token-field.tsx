"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type FieldOption = {
  value: string;
  label: string;
  group?: string;
};

export function TokenField({
  label,
  token,
  value,
  options,
  onChange,
}: {
  label: string;
  token?: string;
  value: string;
  options: FieldOption[];
  onChange: (value: string) => void;
}) {
  const items = Object.fromEntries(options.map((option) => [option.value, option.label]));
  const groups = new Map<string, FieldOption[]>();
  for (const option of options) {
    const key = option.group ?? "";
    const list = groups.get(key) ?? [];
    list.push(option);
    groups.set(key, list);
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select
        items={items}
        value={value}
        onValueChange={(next) => {
          if (typeof next === "string") onChange(next);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {[...groups.entries()].map(([group, groupOptions]) => (
            <SelectGroup key={group || "all"}>
              {group ? <SelectLabel>{group}</SelectLabel> : null}
              {groupOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      {token ? (
        <p className="font-mono text-[11px] leading-snug break-all text-muted-foreground">{token}</p>
      ) : null}
    </div>
  );
}
