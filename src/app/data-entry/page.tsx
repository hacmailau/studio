"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { format, intervalToDuration } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Trash2,
  FileDown,
  Edit,
  PlusCircle,
  XCircle,
  Upload,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import * as XLSX from "xlsx";

// Giả sử đây là danh sách các công đoạn có thể chọn
const CONG_DOAN_LIST = [
  "KR1",
  "KR2",
  "BOF1",
  "BOF2",
  "BOF3",
  "BOF4",
  "BOF5",
  "LF1",
  "LF2",
  "LF3",
  "LF4",
  "LF5",
  "TSC1",
  "TSC2",
  "BCM1",
  "BCM2",
  "BCM3",
];

// Giả sử đây là mapping từ công đoạn sang nhóm
const CONG_DOAN_TO_CATEGORY: { [key: string]: string } = {
  KR1: "Nhóm mác LC",
  KR2: "Nhóm mác LC",
  BOF1: "Nhóm mác SPAH",
  BOF2: "Nhóm mác SPAH",
  BOF3: "Nhóm mác MC",
  BOF4: "Nhóm mác MC",
  BOF5: "Nhóm mác phôi vuông",
  LF1: "Sản xuất điều tiết",
  LF2: "Bảo trì theo kế hoạch",
  LF3: "Bảo trì theo kế hoạch",
  LF4: "Sản xuất điều tiết",
  LF5: "Bảo trì theo kế hoạch",
  TSC1: "Đúc TSC",
  TSC2: "Đúc TSC",
  BCM1: "Đúc BCM",
  BCM2: "Đúc BCM",
  BCM3: "Đúc BCM",
};

interface TaskHistoryItem {
  id: string;
  meThep: string; // Đã thêm
  macThep: string; // Tên cũ là 'name'
  group: string;
  start: string;
  end: string;
  note?: string;
}

interface BatchTaskItem {
  id: number;
  Heat_ID: string;
  Steel_Grade: string;
  Unit: string;
  Start_Time: string;
  End_Time: string;
}

export default function DataEntryPage() {
  const [congDoan, setCongDoan] = useState<string>("");
  const [meThep, setMeThep] = useState<string>("");
  const [macThep, setMacThep] = useState<string>("");
  const [ghiChu, setGhiChu] = useState<string>("");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [history, setHistory] = useState<TaskHistoryItem[]>([]);
  const [editingTask, setEditingTask] = useState<TaskHistoryItem | null>(null);
  const [batchTasks, setBatchTasks] = useState<BatchTaskItem[]>([]);

  // Load state from localStorage on initial render
  useEffect(() => {
    try {
      const savedCongDoan = localStorage.getItem("selectedCongDoan");
      if (savedCongDoan) {
        setCongDoan(savedCongDoan);
      }

      const activeTaskRaw = localStorage.getItem("activeTask");
      if (activeTaskRaw) {
        const activeTask = JSON.parse(activeTaskRaw);
        setMeThep(activeTask.meThep);
        setMacThep(activeTask.macThep);
        setCongDoan(activeTask.congDoan);
        setGhiChu(activeTask.ghiChu || "");
        setStartTime(new Date(activeTask.startTime));
        setIsRecording(true);
      }

      const savedHistory = localStorage.getItem("taskHistory");
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }

      // Initialize batch tasks on client to avoid hydration error
      if (typeof window !== "undefined") {
        setBatchTasks([
          {
            id: Date.now(),
            Heat_ID: "",
            Steel_Grade: "",
            Unit: "",
            Start_Time: "",
            End_Time: "",
          },
        ]);
      }
    } catch (error) {
      console.error("Failed to access localStorage:", error);
      toast.error(
        "Không thể truy cập localStorage. Trình duyệt của bạn có thể không hỗ trợ hoặc đã tắt tính năng này."
      );
    }
  }, []);

  // Timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isRecording && startTime) {
      timer = setInterval(() => {
        const now = new Date();
        const diff = now.getTime() - startTime.getTime();

        const hours = Math.floor(diff / (1000 * 60 * 60))
          .toString()
          .padStart(2, "0");
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
          .toString()
          .padStart(2, "0");
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)
          .toString()
          .padStart(2, "0");

        setElapsedTime(`${hours}:${minutes}:${seconds}`);
      }, 1000);
    }

    return () => {
      clearInterval(timer);
    };
  }, [isRecording, startTime]);

  const handleCongDoanChange = (value: string) => {
    setCongDoan(value);
    localStorage.setItem("selectedCongDoan", value);
  };

  const handleStart = () => {
    if (!meThep) {
      toast.error("Vui lòng nhập Mẻ thép!");
      return;
    }
    if (!macThep) {
      toast.error("Vui lòng nhập Mác thép!");
      return;
    }
    if (!congDoan) {
      toast.error("Vui lòng chọn Công đoạn!");
      return;
    }

    const now = new Date();
    setStartTime(now);
    setIsRecording(true);
    setElapsedTime("00:00:00");

    const activeTask = {
      meThep,
      macThep,
      congDoan,
      ghiChu,
      startTime: now.toISOString(),
    };
    localStorage.setItem("activeTask", JSON.stringify(activeTask));

    toast.success(`Bắt đầu ghi nhận cho mẻ thép ${meThep}`);
  };

  const handleStop = () => {
    const endTime = new Date();
    if (!startTime) return;

    const taskData: TaskHistoryItem = {
      id: `task-${Date.now()}`,
      meThep: meThep,
      macThep: macThep,
      group: congDoan,
      start: startTime.toISOString(),
      end: endTime.toISOString(),
      note: ghiChu,
    };

    const newHistory = [taskData, ...history];
    setHistory(newHistory);
    localStorage.setItem("taskHistory", JSON.stringify(newHistory));

    const ganttTaskData = {
      id: taskData.id,
      name: `${taskData.meThep} - ${taskData.macThep}`, // Tên cho gantt
      start: new Date(taskData.start),
      end: new Date(taskData.end),
      label: taskData.macThep,
      group: taskData.group,
      category: CONG_DOAN_TO_CATEGORY[congDoan] || "Chưa phân loại",
      color: "hsl(203 49% 56% / 0.7)",
    };
    console.log("Dữ liệu công việc đã ghi nhận (chuẩn bị cho Gantt):");
    console.log(JSON.stringify(ganttTaskData, null, 2));

    toast.success(`Đã dừng và lưu dữ liệu cho mẻ thép ${meThep}.`);

    // Reset state and clear localStorage
    setMeThep("");
    setMacThep("");
    setGhiChu("");
    setStartTime(null);
    setIsRecording(false);
    localStorage.removeItem("activeTask");
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("taskHistory");
    toast.success("Đã xóa toàn bộ lịch sử.");
  };

  const exportToExcel = () => {
    if (history.length === 0) {
      toast.error("Không có dữ liệu lịch sử để xuất.");
      return;
    }

    const dataToExport = history
      .map((item) => ({
        "Mẻ thép": item.meThep,
        "Mác thép": item.macThep,
        "Công đoạn": item.group,
        "Bắt đầu": format(new Date(item.start), "dd/MM/yyyy HH:mm:ss", {
          locale: vi,
        }),
        "Kết thúc": format(new Date(item.end), "dd/MM/yyyy HH:mm:ss", {
          locale: vi,
        }),
        "Ghi chú": item.note || "",
      }))
      .sort(
        (a, b) =>
          new Date(a["Bắt đầu"]).getTime() - new Date(b["Bắt đầu"]).getTime()
      );

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "LichSuVanHanh");

    const objectMaxLength = dataToExport.reduce((acc: number[], item: any) => {
      Object.values(item).forEach((value: any, index) => {
        const valueLength = (value || "").toString().length;
        acc[index] = Math.max(acc[index] || 0, valueLength);
      });
      return acc;
    }, []);

    const headerLength = Object.keys(dataToExport[0]).map(
      (header) => header.length
    );
    const wscols = headerLength.map((len, i) => ({
      wch: Math.max(len, objectMaxLength[i]) + 2,
    }));

    worksheet["!cols"] = wscols;

    XLSX.writeFile(workbook, "LichSuVanHanh.xlsx");
    toast.success("Đã xuất dữ liệu ra tệp Excel thành công!");
  };

  const handleUpdateTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTask) return;

    const formData = new FormData(e.currentTarget);
    const updatedTask: TaskHistoryItem = {
      ...editingTask,
      meThep: formData.get("meThep") as string,
      macThep: formData.get("macThep") as string,
      group: formData.get("group") as string,
      note: formData.get("note") as string,
      start: new Date(formData.get("start") as string).toISOString(),
      end: new Date(formData.get("end") as string).toISOString(),
    };

    const newHistory = history.map((task) =>
      task.id === updatedTask.id ? updatedTask : task
    );

    setHistory(newHistory);
    localStorage.setItem("taskHistory", JSON.stringify(newHistory));
    toast.success("Đã cập nhật công việc thành công!");
    setEditingTask(null); // Close dialog by resetting state
  };

  // Helper to format date for datetime-local input
  const formatDateTimeLocal = (isoString: string) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      // Bù lại timezone offset để hiển thị đúng giờ địa phương
      const userTimezoneOffset = date.getTimezoneOffset() * 60000;
      const localDate = new Date(date.getTime() - userTimezoneOffset);
      // Cắt chuỗi để có định dạng YYYY-MM-DDTHH:mm
      return localDate.toISOString().slice(0, 16);
    } catch (e) {
      return "";
    }
  };

  const handleBatchTaskChange = (
    id: number,
    field: keyof BatchTaskItem,
    value: string
  ) => {
    setBatchTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, [field]: value } : task))
    );
  };

  const addBatchTaskRow = () => {
    setBatchTasks((prev) => [
      ...prev,
      {
        id: Date.now(),
        Heat_ID: "",
        Steel_Grade: "",
        Unit: "",
        Start_Time: "",
        End_Time: "",
      },
    ]);
  };

  const removeBatchTaskRow = (id: number) => {
    setBatchTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const handleSubmitBatchTasks = () => {
    // Basic validation
    for (const task of batchTasks) {
      if (
        !task.Heat_ID ||
        !task.Steel_Grade ||
        !task.Unit ||
        !task.Start_Time ||
        !task.End_Time
      ) {
        toast.error(
          "Vui lòng điền đầy đủ thông tin Mẻ thép, Mác thép, Công đoạn, Bắt đầu và Kết thúc cho tất cả các mẻ."
        );
        return;
      }
    }

    const tasksToSubmit = batchTasks.map((task) => ({
      ...task,
      category: CONG_DOAN_TO_CATEGORY[task.Unit] || "Chưa phân loại",
    }));

    console.log(
      "Dữ liệu gửi hàng loạt:",
      JSON.stringify(tasksToSubmit, null, 2)
    );
    toast.success(
      `Đã chuẩn bị gửi ${tasksToSubmit.length} mẻ. Kiểm tra console để xem dữ liệu.`
    );

    // Here you would typically send the data to your backend/DB
    // For now, we just log it.

    // Optional: add to local history as well
    const newHistoryItems: TaskHistoryItem[] = tasksToSubmit.map((task) => ({
      id: `task-${Date.now()}-${task.id}`,
      meThep: task.Heat_ID,
      macThep: task.Steel_Grade,
      group: task.Unit,
      start: new Date(task.Start_Time).toISOString(),
      end: new Date(task.End_Time).toISOString(),
      note: "", // No note field in the new model
    }));

    const newHistory = [...newHistoryItems, ...history];
    setHistory(newHistory);
    localStorage.setItem("taskHistory", JSON.stringify(newHistory));

    // Reset batch form
    setBatchTasks([
      {
        id: Date.now(),
        Heat_ID: "",
        Steel_Grade: "",
        Unit: "",
        Start_Time: "",
        End_Time: "",
      },
    ]);
  };

  const handleSendHistory = async () => {
    if (history.length === 0) {
      toast.error("Không có dữ liệu lịch sử để gửi.");
      return;
    }

    // Chuyển đổi dữ liệu sang model mới
    const dataToSend = history.map((item) => ({
      Heat_ID: item.meThep,
      Steel_Grade: item.macThep,
      Unit: item.group,
      Start_Time: item.start,
      End_Time: item.end,
      // Ghi chú có thể được thêm vào nếu server hỗ trợ
      // Note: item.note || '',
    }));

    // Mô phỏng việc gửi dữ liệu lên server
    console.log(
      "Đang gửi dữ liệu lịch sử lên server (model mới):",
      JSON.stringify(dataToSend, null, 2)
    );

    try {
      // Giả sử đây là một lời gọi API thành công
      // await api.post('/history', dataToSend);

      toast.success(
        `Đã gửi ${history.length} mục lên máy chủ thành công! Dữ liệu cục bộ sẽ được xóa.`
      );

      // Xóa dữ liệu sau khi gửi thành công
      setHistory([]);
      localStorage.removeItem("taskHistory");
    } catch (error) {
      toast.error("Gửi dữ liệu thất bại. Vui lòng thử lại.");
      console.error("Lỗi khi gửi dữ liệu:", error);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="p-4 border-b bg-card">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary font-headline">
            Nhập liệu vận hành
          </h1>
          <Link href="/">
            <Button variant="outline">Trở về trang chủ</Button>
          </Link>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-8">
        <div className="container mx-auto grid gap-8">
          <div className="grid gap-8 md:grid-cols-2">
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Ghi nhận thời gian vận hành</CardTitle>
                <CardDescription>
                  Chọn công đoạn, nhập thông tin mẻ và nhấn "Bắt đầu" để ghi
                  nhận.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="cong-doan">
                    Chọn công đoạn <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    onValueChange={handleCongDoanChange}
                    value={congDoan}
                    disabled={isRecording}
                  >
                    <SelectTrigger id="cong-doan">
                      <SelectValue placeholder="Chọn một công đoạn..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CONG_DOAN_LIST.map((cd) => (
                        <SelectItem key={cd} value={cd}>
                          {cd}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="me-thep">
                      Mẻ thép <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="me-thep"
                      value={meThep}
                      onChange={(e) => setMeThep(e.target.value)}
                      placeholder="VD: 123456"
                      required
                      disabled={isRecording}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="mac-thep">
                      Mác thép <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="mac-thep"
                      value={macThep}
                      onChange={(e) => setMacThep(e.target.value)}
                      placeholder="VD: SWHR82B"
                      required
                      disabled={isRecording}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ghi-chu">Ghi chú</Label>
                  <Input
                    id="ghi-chu"
                    value={ghiChu}
                    onChange={(e) => setGhiChu(e.target.value)}
                    placeholder="VD: Chẻ mẻ, chuyển mác"
                    disabled={isRecording}
                  />
                </div>

                {isRecording && startTime && (
                  <div className="p-4 bg-muted/50 rounded-lg text-center grid gap-2">
                    <p className="text-sm text-muted-foreground">
                      Đang ghi nhận cho mẻ thép{" "}
                      <span className="font-bold text-primary">{meThep}</span>{" "}
                      tại <span className="font-bold">{congDoan}</span>
                    </p>

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Bắt đầu lúc
                      </p>
                      <p className="font-bold text-xl text-primary">
                        {startTime.toLocaleTimeString("vi-VN")}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Thời gian vận hành
                      </p>
                      <p className="font-mono text-3xl font-bold text-foreground">
                        {elapsedTime}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="grid grid-cols-2 gap-4">
                <Button
                  onClick={handleStart}
                  disabled={isRecording}
                  className="w-full text-base font-bold"
                  size="lg"
                >
                  Bắt đầu
                </Button>
                <Button
                  onClick={handleStop}
                  disabled={!isRecording}
                  variant="destructive"
                  className="w-full text-base font-bold"
                  size="lg"
                >
                  Dừng
                </Button>
              </CardFooter>
            </Card>

            <Card className="w-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Lịch sử ghi nhận</CardTitle>
                    <CardDescription>
                      Các công việc đã hoàn thành gần đây. Bạn có thể sửa lại.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={history.length === 0}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Gửi dữ liệu
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Xác nhận gửi dữ liệu?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Hành động này sẽ gửi toàn bộ {history.length} mục
                            trong lịch sử lên máy chủ và xóa dữ liệu cục bộ. Bạn
                            có chắc chắn không?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Hủy</AlertDialogCancel>
                          <AlertDialogAction onClick={handleSendHistory}>
                            Gửi và Xóa
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportToExcel}
                      disabled={history.length === 0}
                    >
                      <FileDown className="mr-2 h-4 w-4" />
                      Export Excel
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={history.length === 0}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Bạn có chắc chắn muốn xóa?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Hành động này sẽ xóa toàn bộ lịch sử ghi nhận và
                            không thể hoàn tác.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Hủy</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={clearHistory}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Xóa
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {history.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {history.map((item) => {
                      const duration = intervalToDuration({
                        start: new Date(item.start),
                        end: new Date(item.end),
                      });
                      const formattedDuration = [
                        duration.hours ? `${duration.hours} giờ` : "",
                        duration.minutes ? `${duration.minutes} phút` : "",
                        duration.seconds ? `${duration.seconds} giây` : "",
                      ]
                        .filter(Boolean)
                        .join(" ");

                      return (
                        <div
                          key={item.id}
                          className="relative p-3 border rounded-lg text-sm pr-10"
                        >
                          <div className="font-bold">
                            {item.meThep} - {item.macThep}{" "}
                            <span className="font-normal text-muted-foreground">
                              ({item.group})
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <span>
                              BĐ:{" "}
                              {format(new Date(item.start), "dd/MM HH:mm:ss", {
                                locale: vi,
                              })}
                            </span>
                            {" - "}
                            <span>
                              KT:{" "}
                              {format(new Date(item.end), "dd/MM HH:mm:ss", {
                                locale: vi,
                              })}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            <span className="font-semibold text-foreground">
                              Thời gian thực hiện:{" "}
                            </span>
                            <span>{formattedDuration || "dưới 1 giây"}</span>
                          </div>
                          {item.note && (
                            <div className="text-xs mt-1">
                              <span className="font-semibold">Ghi chú: </span>
                              <span className="text-muted-foreground">
                                {item.note}
                              </span>
                            </div>
                          )}

                          <Dialog
                            onOpenChange={(isOpen) =>
                              !isOpen && setEditingTask(null)
                            }
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-1/2 right-2 -translate-y-1/2"
                                onClick={() => setEditingTask(item)}
                              >
                                <Edit className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </DialogTrigger>
                            {editingTask && editingTask.id === item.id && (
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Chỉnh sửa công việc</DialogTitle>
                                  <DialogDescription>
                                    Điều chỉnh thông tin cho mẻ thép và lưu lại.
                                  </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleUpdateTask}>
                                  <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <Label
                                        htmlFor="edit-me-thep"
                                        className="text-right"
                                      >
                                        Mẻ thép
                                      </Label>
                                      <Input
                                        id="edit-me-thep"
                                        name="meThep"
                                        defaultValue={editingTask.meThep}
                                        className="col-span-3"
                                      />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <Label
                                        htmlFor="edit-mac-thep"
                                        className="text-right"
                                      >
                                        Mác thép
                                      </Label>
                                      <Input
                                        id="edit-mac-thep"
                                        name="macThep"
                                        defaultValue={editingTask.macThep}
                                        className="col-span-3"
                                      />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <Label
                                        htmlFor="edit-group"
                                        className="text-right"
                                      >
                                        Công đoạn
                                      </Label>
                                      <Select
                                        name="group"
                                        defaultValue={editingTask.group}
                                      >
                                        <SelectTrigger className="col-span-3">
                                          <SelectValue placeholder="Chọn công đoạn" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {CONG_DOAN_LIST.map((cd) => (
                                            <SelectItem key={cd} value={cd}>
                                              {cd}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <Label
                                        htmlFor="edit-note"
                                        className="text-right"
                                      >
                                        Ghi chú
                                      </Label>
                                      <Input
                                        id="edit-note"
                                        name="note"
                                        defaultValue={editingTask.note}
                                        className="col-span-3"
                                      />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <Label
                                        htmlFor="edit-start"
                                        className="text-right"
                                      >
                                        Bắt đầu
                                      </Label>
                                      <Input
                                        id="edit-start"
                                        name="start"
                                        type="datetime-local"
                                        defaultValue={formatDateTimeLocal(
                                          editingTask.start
                                        )}
                                        className="col-span-3"
                                      />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <Label
                                        htmlFor="edit-end"
                                        className="text-right"
                                      >
                                        Kết thúc
                                      </Label>
                                      <Input
                                        id="edit-end"
                                        name="end"
                                        type="datetime-local"
                                        defaultValue={formatDateTimeLocal(
                                          editingTask.end
                                        )}
                                        className="col-span-3"
                                      />
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <DialogClose asChild>
                                      <Button type="button" variant="secondary">
                                        Hủy
                                      </Button>
                                    </DialogClose>
                                    <Button type="submit">Lưu thay đổi</Button>
                                  </DialogFooter>
                                </form>
                              </DialogContent>
                            )}
                          </Dialog>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Chưa có lịch sử ghi nhận.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Nhập liệu hàng loạt</CardTitle>
              <CardDescription>
                Thêm nhiều mẻ thép cùng lúc và gửi dữ liệu.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {batchTasks.map((task, index) => (
                  <div
                    key={task.id}
                    className="grid grid-cols-11 gap-2 items-center p-2 border rounded-md"
                  >
                    <Input
                      placeholder="Heat ID"
                      className="col-span-2"
                      value={task.Heat_ID}
                      onChange={(e) =>
                        handleBatchTaskChange(
                          task.id,
                          "Heat_ID",
                          e.target.value
                        )
                      }
                    />
                    <Input
                      placeholder="Steel Grade"
                      className="col-span-2"
                      value={task.Steel_Grade}
                      onChange={(e) =>
                        handleBatchTaskChange(
                          task.id,
                          "Steel_Grade",
                          e.target.value
                        )
                      }
                    />
                    <div className="col-span-2">
                      <Select
                        onValueChange={(value) =>
                          handleBatchTaskChange(task.id, "Unit", value)
                        }
                        value={task.Unit}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Công đoạn" />
                        </SelectTrigger>
                        <SelectContent>
                          {CONG_DOAN_LIST.map((cd) => (
                            <SelectItem key={cd} value={cd}>
                              {cd}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Label
                      htmlFor={`start-${task.id}`}
                      className="col-span-2 cursor-pointer"
                    >
                      <Input
                        id={`start-${task.id}`}
                        type="datetime-local"
                        value={task.Start_Time}
                        onChange={(e) =>
                          handleBatchTaskChange(
                            task.id,
                            "Start_Time",
                            e.target.value
                          )
                        }
                      />
                    </Label>
                    <Label
                      htmlFor={`end-${task.id}`}
                      className="col-span-2 cursor-pointer"
                    >
                      <Input
                        id={`end-${task.id}`}
                        type="datetime-local"
                        value={task.End_Time}
                        onChange={(e) =>
                          handleBatchTaskChange(
                            task.id,
                            "End_Time",
                            e.target.value
                          )
                        }
                      />
                    </Label>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeBatchTaskRow(task.id)}
                      disabled={batchTasks.length <= 1}
                    >
                      <XCircle className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addBatchTaskRow}
                className="mt-4"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Thêm mẻ
              </Button>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleSubmitBatchTasks}
                className="w-full"
                size="lg"
              >
                Gửi tất cả các mẻ đã nhập
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}
