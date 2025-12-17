"use client";

import { GanttChart } from "@/components/gantt-chart-product";
import { tasks as allTasks } from "@/lib/gantt-data-product";
import {
  Calendar as CalendarIcon,
  Target,
  Factory,
  Package,
  CheckCircle,
  Wrench,
} from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import * as React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { vi } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";

export default function Home() {
  const [date, setDate] = React.useState<DateRange | undefined>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    return {
      from: new Date(year, month, 15),
      to: new Date(year, month, 16),
    };
  });

  const filteredTasks = allTasks.filter((task) => {
    // Condition 1: Task must have both category and group
    const hasRequiredFields = task.category && task.group;
    if (!hasRequiredFields) {
      return false;
    }

    // Condition 2: Task must be within the selected date range
    if (!date?.from || !date?.to) return true;

    const taskStart = task.start;
    const taskEnd = task.end;

    const fromDate = new Date(date.from);
    fromDate.setHours(0, 0, 0, 0);

    const toDate = new Date(date.to);
    toDate.setHours(23, 59, 59, 999);

    return taskStart < toDate && taskEnd > fromDate;
  });

  const reportData = [
    {
      title: "Kế hoạch sản xuất",
      value: "100,000 Tấn",
      icon: Target,
      color: "text-blue-500",
    },
    {
      title: "Sản lượng",
      value: "85,000 Tấn",
      icon: Factory,
      progress: 85,
      color: "text-green-500",
    },
    {
      title: "Tồn kho",
      value: "15,000 Tấn",
      icon: Package,
      color: "text-orange-500",
    },
    {
      title: "Chất lượng",
      value: "98% Đạt",
      icon: CheckCircle,
      color: "text-teal-500",
    },
    {
      title: "Thiết bị",
      value: "95% Sẵn sàng",
      icon: Wrench,
      color: "text-purple-500",
    },
  ];

  return (
    <div className="bg-background min-h-screen flex flex-col">
      <header className="p-4 border-b bg-card">
        <div className="container mx-auto flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold text-primary font-headline">
            GanttNow
          </h1>
          <div className="flex items-center gap-4">
            <Link href="/data-entry">
              <Button variant="outline">Nhập liệu</Button>
            </Link>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-[300px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      <>
                        {format(date.from, "PPP", { locale: vi })} -{" "}
                        {format(date.to, "PPP", { locale: vi })}
                      </>
                    ) : (
                      format(date.from, "PPP", { locale: vi })
                    )
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={2}
                  locale={vi}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-8">
        <div className="container mx-auto">
          <section className="mb-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
              {reportData.map((item, index) => (
                <Card key={index}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {item.title}
                    </CardTitle>
                    <item.icon
                      className={cn(
                        "h-4 w-4 text-muted-foreground",
                        item.color
                      )}
                    />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{item.value}</div>
                    {item.progress !== undefined && (
                      <Progress value={item.progress} className="mt-2 h-2" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
          <GanttChart tasks={filteredTasks} viewRange={date} />
        </div>
      </main>
    </div>
  );
}
