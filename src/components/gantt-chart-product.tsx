"use client";

import type { Task } from "@/lib/gantt-data-product";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  format,
  differenceInMilliseconds,
  eachHourOfInterval,
  startOfDay,
  endOfDay,
  addDays,
} from "date-fns";
import type { DateRange } from "react-day-picker";
import React from "react";
import { vi } from "date-fns/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 60;
const HOUR_WIDTH = 50;
const Y_AXIS_WIDTH_CATEGORY = 150;
const Y_AXIS_WIDTH_GROUP = 200;
const Y_AXIS_TOTAL_WIDTH = Y_AXIS_WIDTH_CATEGORY + Y_AXIS_WIDTH_GROUP;

interface GroupedTasks {
  [category: string]: {
    [group: string]: Task[];
  };
}

function groupTasks(
  tasks: Task[]
): [GroupedTasks, string[], { category: string; group: string }[]] {
  const validTasks = tasks.filter((task) => task.category && task.group);

  const grouped = validTasks.reduce((acc, task) => {
    const { category, group } = task;
    if (!acc[category]) {
      acc[category] = {};
    }
    if (!acc[category][group]) {
      acc[category][group] = [];
    }
    acc[category][group].push(task);
    return acc;
  }, {} as GroupedTasks);

  const categories = Object.keys(grouped).sort();
  const yAxisRows: { category: string; group: string }[] = [];
  categories.forEach((category) => {
    Object.keys(grouped[category])
      .sort()
      .forEach((group) => {
        yAxisRows.push({ category, group });
      });
  });

  return [grouped, categories, yAxisRows];
}

function getTimelineInfo(tasks: Task[], viewRange?: DateRange) {
  if (!viewRange?.from || !viewRange?.to) {
    const now = new Date();
    return {
      timelineStart: startOfDay(now),
      timelineEnd: endOfDay(addDays(now, 1)),
    };
  }

  return {
    timelineStart: startOfDay(viewRange.from),
    timelineEnd: endOfDay(viewRange.to),
  };
}

function TaskBar({
  task,
  timelineStart,
  timelineDurationMillis,
}: {
  task: Task;
  timelineStart: Date;
  timelineDurationMillis: number;
}) {
  const startMillis = Math.max(
    0,
    task.start.getTime() - timelineStart.getTime()
  );
  const endMillis = Math.min(
    timelineDurationMillis,
    task.end.getTime() - timelineStart.getTime()
  );

  const left = (startMillis / timelineDurationMillis) * 100;
  const width = Math.max(
    ((endMillis - startMillis) / timelineDurationMillis) * 100,
    0.1
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            style={{
              left: `${left}%`,
              width: `${width}%`,
              height: `${ROW_HEIGHT - 10}px`,
              top: "5px",
              backgroundColor: task.color,
            }}
            className={cn(
              "absolute flex items-center justify-center rounded-sm p-2 text-xs font-semibold text-white shadow-md"
            )}
          >
            <span className="truncate">{task.label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="p-2 text-sm">
            <p className="font-bold">{task.label || task.name}</p>
            <p>
              Bắt đầu: {format(task.start, "dd/MM/yyyy HH:mm", { locale: vi })}
            </p>
            <p>
              Kết thúc: {format(task.end, "dd/MM/yyyy HH:mm", { locale: vi })}
            </p>
            <p>Nhóm: {task.category}</p>
            <p>Công việc: {task.group}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function GanttChart({
  tasks,
  viewRange,
}: {
  tasks: Task[];
  viewRange?: DateRange;
}) {
  const validTasks = tasks.filter((t) => t.category && t.group);
  const [groupedTasks, categories, yAxisRows] = groupTasks(validTasks);
  const { timelineStart, timelineEnd } = getTimelineInfo(validTasks, viewRange);
  const timelineDurationMillis = differenceInMilliseconds(
    timelineEnd,
    timelineStart
  );

  const hours = eachHourOfInterval({
    start: timelineStart,
    end: timelineEnd,
  });

  const totalHours = hours.length;
  const TIMELINE_WIDTH = totalHours * HOUR_WIDTH;

  const totalRows = yAxisRows.length;
  const BODY_HEIGHT = totalRows * ROW_HEIGHT;

  return (
    <Card className="overflow-x-auto">
      <div
        style={{ height: `${HEADER_HEIGHT + BODY_HEIGHT}px` }}
        className="relative"
      >
        <div
          className="grid h-full"
          style={{
            width: `${Y_AXIS_TOTAL_WIDTH + TIMELINE_WIDTH}px`,
            gridTemplateColumns: `${Y_AXIS_TOTAL_WIDTH}px 1fr`,
          }}
        >
          {/* Y-Axis */}
          <div className="sticky left-0 z-20 bg-card">
            {/* Y-Axis Header */}
            <div
              style={{ height: `${HEADER_HEIGHT}px` }}
              className="flex border-r border-b"
            >
              <div
                style={{ width: `${Y_AXIS_WIDTH_CATEGORY}px` }}
                className="flex items-center justify-center p-2 font-bold text-center border-r"
              >
                Nhóm
              </div>
              <div
                style={{ width: `${Y_AXIS_WIDTH_GROUP}px` }}
                className="flex items-center justify-center p-2 font-bold text-center"
              >
                Công việc
              </div>
            </div>
            {/* Y-Axis Body */}
            <div className="relative" style={{ height: `${BODY_HEIGHT}px` }}>
              <div
                style={{ width: `${Y_AXIS_WIDTH_CATEGORY}px` }}
                className="absolute top-0 left-0 h-full shrink-0 border-r"
              >
                {categories.map((category) => {
                  const groupsInCategory = Object.keys(
                    groupedTasks[category] || {}
                  );
                  const categoryHeight = groupsInCategory.length * ROW_HEIGHT;
                  if (categoryHeight === 0) return null;
                  return (
                    <div
                      key={category}
                      style={{ height: `${categoryHeight}px` }}
                      className="flex items-center justify-center p-2 border-b text-sm font-semibold text-center"
                    >
                      <span className="truncate">{category}</span>
                    </div>
                  );
                })}
              </div>
              <div
                style={{ width: `${Y_AXIS_WIDTH_GROUP}px` }}
                className="absolute top-0 left-[150px] h-full shrink-0 border-r"
              >
                {yAxisRows.map((row, index) => (
                  <div
                    key={`${row.category}-${row.group}-${index}`}
                    style={{ height: `${ROW_HEIGHT}px` }}
                    className="flex items-center p-2 border-b text-sm truncate"
                    title={row.group}
                  >
                    {row.group}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div
            className="relative overflow-y-hidden"
            style={{ width: `${TIMELINE_WIDTH}px` }}
          >
            {/* X-Axis Header */}
            <div className="sticky top-0 z-10 bg-card border-b">
              <div
                className="relative"
                style={{
                  width: `${TIMELINE_WIDTH}px`,
                  height: `${HEADER_HEIGHT}px`,
                }}
              >
                <div className="flex flex-col h-full">
                  <div className="flex h-1/2">
                    {hours.map((hour, index) => {
                      const isFirstHourOfDay = hour.getHours() === 0;
                      if (isFirstHourOfDay || index === 0) {
                        const day = hour;
                        // Find next day start
                        const nextDayIndex = hours.findIndex(
                          (h, i) => i > index && h.getHours() === 0
                        );
                        let daySpan;
                        if (nextDayIndex !== -1) {
                          daySpan = nextDayIndex - index;
                        } else {
                          daySpan = hours.length - index;
                        }

                        const width = daySpan * HOUR_WIDTH;
                        return (
                          <div
                            key={`day-${hour.toString()}`}
                            style={{ width: `${width}px` }}
                            className="shrink-0 border-r text-center text-sm text-muted-foreground p-1 font-semibold flex items-center justify-center"
                          >
                            {format(hour, "dd/MM/yyyy - EEE", { locale: vi })}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                  <div className="flex h-1/2 border-t">
                    {hours.map((hour) => (
                      <div
                        key={hour.toString()}
                        style={{ width: `${HOUR_WIDTH}px` }}
                        className="shrink-0 border-r text-center text-xs text-muted-foreground p-1 font-medium"
                      >
                        {format(hour, "H")}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* Timeline Body */}
            <div className="relative">
              <div
                className="relative"
                style={{
                  width: `${TIMELINE_WIDTH}px`,
                  height: `${BODY_HEIGHT}px`,
                }}
              >
                {/* Background Grid Lines */}
                <div
                  className="absolute inset-0 grid"
                  style={{ gridTemplateColumns: `repeat(${totalHours}, 1fr)` }}
                >
                  {hours.map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "border-r",
                        hours[i].getHours() === 0 &&
                          "border-l-gray-400 border-l-2"
                      )}
                    />
                  ))}
                </div>
                <div className="absolute inset-0">
                  {Array.from({ length: totalRows }).map((_, i) => (
                    <div
                      key={i}
                      className="border-b"
                      style={{ height: `${ROW_HEIGHT}px` }}
                    />
                  ))}
                </div>

                {/* Task Bars */}
                <div className="absolute inset-0">
                  {yAxisRows.map((row, index) => (
                    <div
                      key={`${row.category}-${row.group}-${index}`}
                      className="relative"
                      style={{
                        top: `${index * ROW_HEIGHT}px`,
                        height: `${ROW_HEIGHT}px`,
                      }}
                    >
                      {(groupedTasks[row.category]?.[row.group] || []).map(
                        (task) => (
                          <TaskBar
                            key={task.id}
                            task={task}
                            timelineStart={timelineStart}
                            timelineDurationMillis={timelineDurationMillis}
                          />
                        )
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default GanttChart;
