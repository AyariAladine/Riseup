"use client";
import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Task = {
  _id: string;
  title: string;
  completed?: boolean;
  status?: "pending" | "in_progress" | "completed";
  dueAt?: string | null;
  description?: string;
  aiSummary?: string;
};

type Column = {
  id: string;
  title: string;
  tasks: Task[];
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "board">("list");
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState<string | null>(
    null,
  );
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");

  // Refs to track ongoing operations and prevent memory leaks
  const ongoingOperations = useRef(new Set<string>());
  const mountedRef = useRef(true);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
  );

  useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await fetch("/api/tasks", {
          method: "GET",
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          const tasksWithStatus = data.tasks.map((task: any) => ({
            ...task,
            status: task.status || (task.completed ? "completed" : "pending"),
          }));
          setTasks(tasksWithStatus);
        } else {
          console.debug("Failed to fetch tasks");
          setError("Failed to load tasks");
        }
      } catch (err: unknown) {
        console.debug(
          "Error fetching tasks",
          err instanceof Error ? err.message : String(err),
        );
        setError("Failed to load tasks");
      } finally {
        setLoading(false);
      }
    }

    fetchTasks();

    // Cleanup function
    return () => {
      mountedRef.current = false;
      ongoingOperations.current.clear();
    };
  }, []);

  const columns: Column[] = useMemo(() => {
    const pending = tasks.filter((t) => t.status === "pending");
    const inProgress = tasks.filter((t) => t.status === "in_progress");
    const completed = tasks.filter((t) => t.status === "completed");

    return [
      { id: "pending", title: "To Do", tasks: pending },
      { id: "in_progress", title: "In Progress", tasks: inProgress },
      { id: "completed", title: "Done", tasks: completed },
    ];
  }, [tasks]);

  async function addTask() {
    const name = title.trim();
    if (!name) return;
    setTitle("");

    // Optimistic create: add a temporary task to the UI immediately
    const tempId = `tmp-${Date.now()}`;
    const tempTask: Task = {
      _id: tempId,
      title: name,
      status: "pending",
      description: "",
    };
    setTasks((prev) => [tempTask, ...prev]);

    // Track this operation
    const operationId = `add-${tempId}`;
    ongoingOperations.current.add(operationId);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: name }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create");
      const data = await res.json();
      const newTask = {
        ...data.task,
        status: data.task.status || "pending",
      } as Task;

      // Only update if component is still mounted and operation is still ongoing
      if (mountedRef.current && ongoingOperations.current.has(operationId)) {
        // Replace temp task with server-provided task
        setTasks((prev) => prev.map((t) => (t._id === tempId ? newTask : t)));
      }
    } catch (err: unknown) {
      console.debug(
        "create task failed",
        err instanceof Error ? err.message : String(err),
      );

      // Only rollback if component is still mounted and operation is still ongoing
      if (mountedRef.current && ongoingOperations.current.has(operationId)) {
        // Remove temp task on failure
        setTasks((prev) => prev.filter((t) => t._id !== tempId));
        setError(
          "Unable to create task (maybe offline). It will not persist until you are online.",
        );
      }
    } finally {
      ongoingOperations.current.delete(operationId);
    }
  }

  async function updateTaskStatus(taskId: string, newStatus: Task["status"]) {
    // Skip API calls for static tasks
    if (taskId.startsWith("static-")) {
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t)),
      );
      // Only generate AI summary for completed tasks and only if not already generated
      if (
        newStatus === "completed" &&
        !tasks.find((t) => t._id === taskId)?.aiSummary
      ) {
        // Add a small delay to avoid generating summary immediately on drag
        setTimeout(() => generateAISummary(taskId), 500);
      }
      return;
    }

    // Track this operation
    const operationId = `update-${taskId}-${Date.now()}`;
    ongoingOperations.current.add(operationId);

    // Store current state for potential rollback
    const currentTasks = [...tasks];

    // Optimistic update: keep backup to rollback on failure
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t)),
    );

    try {
      const completed = newStatus === "completed";
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update");
      const data = await res.json();

      // Only update if component is still mounted and operation is still ongoing
      if (mountedRef.current && ongoingOperations.current.has(operationId)) {
        // Ensure state matches server
        setTasks((prev) =>
          prev.map((t) =>
            t._id === taskId ? { ...data.task, status: newStatus } : t,
          ),
        );

        // Generate AI summary for completed tasks
        if (newStatus === "completed") {
          console.log(`Generating AI summary for task ${taskId} after status update to ${newStatus}`);
          generateAISummary(taskId);
        }
      }
    } catch (err: unknown) {
      console.debug(
        "update task failed",
        err instanceof Error ? err.message : String(err),
      );

      // Only rollback if component is still mounted and operation is still ongoing
      if (mountedRef.current && ongoingOperations.current.has(operationId)) {
        setTasks(currentTasks); // rollback
        setError("Failed to update task");
      }
    } finally {
      ongoingOperations.current.delete(operationId);
    }
  }

  const generateAISummary = useCallback(
    async (taskId: string) => {
      console.log(`generateAISummary called for task ${taskId}`);
      // Prevent multiple simultaneous summary generations for the same task
      if (generatingSummary === taskId) {
        console.log(`Summary already generating for task ${taskId}, skipping`);
        return;
      }

      setGeneratingSummary(taskId);
      console.log(`Starting AI summary generation for task ${taskId}`);
      try {
        const task = tasks.find((t) => t._id === taskId);
        if (!task) {
          console.log(`Task ${taskId} not found in current tasks`);
          return;
        }

        console.log(`Found task ${taskId}:`, { title: task.title, status: task.status });

        // For static tasks, generate a simple mock summary
        if (taskId.startsWith("static-")) {
          setTimeout(() => {
            if (mountedRef.current) {
              setTasks((prev) =>
                prev.map((t) =>
                  t._id === taskId
                    ? {
                        ...t,
                        aiSummary: `Task "${t.title}" has been completed successfully.`,
                      }
                    : t,
                ),
              );
              setGeneratingSummary(null);
            }
          }, 1000); // Simulate API delay
          return;
        }

        const res = await fetch("/api/tasks/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId,
            title: task.title,
            description: task.description || "",
          }),
          credentials: "include",
        });

        console.log(`API call to /api/tasks/summary for task ${taskId}, response status: ${res.status}`);

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error("AI summary API error:", res.status, errorData);
          throw new Error(`Failed to generate summary: ${res.status}`);
        }

        const data = await res.json();
        console.log(`AI summary generated successfully for task ${taskId}:`, data.summary);

        // Only update if component is still mounted
        if (mountedRef.current) {
          setTasks((prev) =>
            prev.map((t) =>
              t._id === taskId ? { ...t, aiSummary: data.summary } : t,
            ),
          );
        }
      } catch (err: unknown) {
        console.error(
          "AI summary generation failed:",
          err instanceof Error ? err.message : String(err),
        );
        // Show user-friendly error message
        if (mountedRef.current) {
          setError("Failed to generate AI summary. Please try again.");
          // Clear error after 3 seconds
          setTimeout(() => setError(null), 3000);
        }
      } finally {
        // Only update if component is still mounted
        if (mountedRef.current && !taskId.startsWith("static-")) {
          setGeneratingSummary(null);
        }
      }
    },
    [tasks, generatingSummary],
  );

  // Ref to store the latest generateAISummary function to avoid useEffect dependency issues
  const generateAISummaryRef = useRef(generateAISummary);

  // Update the ref whenever generateAISummary changes
  useEffect(() => {
    generateAISummaryRef.current = generateAISummary;
  }, [generateAISummary]);

  // Listen for AI summary generation requests
  useEffect(() => {
    const handleGenerateSummary = (e: CustomEvent<string>) => {
      generateAISummaryRef.current(e.detail);
    };
    window.addEventListener(
      "generate-summary",
      handleGenerateSummary as EventListener,
    );
    return () =>
      window.removeEventListener(
        "generate-summary",
        handleGenerateSummary as EventListener,
      );
  }, []); // Empty dependency array since we use ref

  async function deleteTask(id: string) {
    // Skip API calls for static tasks
    if (id.startsWith("static-")) {
      setTasks((prev) => prev.filter((t) => t._id !== id));
      return;
    }

    // Track this operation
    const operationId = `delete-${id}-${Date.now()}`;
    ongoingOperations.current.add(operationId);

    // Store current state for potential rollback
    const currentTasks = [...tasks];

    // Optimistic remove
    setTasks((prev) => prev.filter((t) => t._id !== id));

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok && res.status !== 204) throw new Error("Failed");

      // Operation successful, no need to update state as optimistic update was correct
    } catch (err: unknown) {
      // Only rollback if component is still mounted and operation is still ongoing
      if (mountedRef.current && ongoingOperations.current.has(operationId)) {
        // Rollback on failure
        setTasks(currentTasks);
        console.debug(
          "delete task failed",
          err instanceof Error ? err.message : String(err),
        );
        setError("Failed to delete task");
      }
    } finally {
      ongoingOperations.current.delete(operationId);
    }
  }

  function startEditTask(task: Task) {
    setEditingTaskId(task._id);
    setEditingTitle(task.title);
    setEditingDescription(task.description || "");
  }

  function cancelEditTask() {
    setEditingTaskId(null);
    setEditingTitle("");
    setEditingDescription("");
  }

  async function saveEditTask() {
    if (!editingTaskId) return;

    const task = tasks.find((t) => t._id === editingTaskId);
    if (!task) return;

    // Skip API calls for static tasks
    if (editingTaskId.startsWith("static-")) {
      setTasks((prev) =>
        prev.map((t) =>
          t._id === editingTaskId
            ? { ...t, title: editingTitle, description: editingDescription }
            : t,
        ),
      );
      cancelEditTask();
      return;
    }

    // Track this operation
    const operationId = `edit-${editingTaskId}-${Date.now()}`;
    ongoingOperations.current.add(operationId);

    // Store current state for potential rollback
    const currentTasks = [...tasks];

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t._id === editingTaskId
          ? { ...t, title: editingTitle, description: editingDescription }
          : t,
      ),
    );

    try {
      const res = await fetch(`/api/tasks/${editingTaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editingTitle,
          description: editingDescription,
        }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to update task");

      const data = await res.json();

      // Only update if component is still mounted and operation is still ongoing
      if (mountedRef.current && ongoingOperations.current.has(operationId)) {
        setTasks((prev) =>
          prev.map((t) =>
            t._id === editingTaskId
              ? { ...data.task, status: data.task.status || t.status }
              : t,
          ),
        );
        cancelEditTask();
      }
    } catch (err: unknown) {
      console.debug(
        "update task failed",
        err instanceof Error ? err.message : String(err),
      );

      // Only rollback if component is still mounted and operation is still ongoing
      if (mountedRef.current && ongoingOperations.current.has(operationId)) {
        setTasks(currentTasks); // rollback
        setError("Failed to update task");
      }
    } finally {
      ongoingOperations.current.delete(operationId);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const task = tasks.find((t) => t._id === active.id);
    setActiveTask(task || null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the containers
    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer) return;

    if (activeContainer !== overContainer) {
      console.log(
        `Drag over: moving task ${activeId} from ${activeContainer} to ${overContainer}`,
      );
      setTasks((items) => {
        return items.map((t) => {
          if (t._id === activeId) {
            return { ...t, status: overContainer as Task["status"] };
          }
          return t;
        });
      });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer) return;

    // Only update if containers are different
    if (activeContainer !== overContainer) {
      console.log(
        `Moving task ${activeId} from ${activeContainer} to ${overContainer}`,
      );
      updateTaskStatus(activeId, overContainer as Task["status"]);
    }
  }

  function findContainer(id: string) {
    if (id === "pending" || id === "in_progress" || id === "completed") {
      return id;
    }
    return tasks.find((t) => t._id === id)?.status;
  }

  // Prevent hydration mismatch by showing loading state until client is ready
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-purple-900/20 dark:to-pink-900/20 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-1">
                <div className="bg-white dark:bg-slate-800 rounded-full h-full w-full"></div>
              </div>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-pulse opacity-20"></div>
            </div>
            <span className="ml-4 text-slate-700 dark:text-slate-300 font-medium">
              Loading your tasks...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === "board") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Section */}
          <div className="mb-12">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
              <div className="space-y-2">
                <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Task Management
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400">
                  Organize and track your tasks with AI-powered insights
                </p>
              </div>

              {/* View Toggle Buttons */}
              <div className="flex bg-white dark:bg-slate-800 rounded-xl p-1 shadow-sm border border-slate-200 dark:border-slate-700">
                <button
                  className="px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                  onClick={() => setViewMode("list")}
                >
                  List View
                </button>
                <button
                  className="px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                  onClick={() => setViewMode("board")}
                >
                  Board View
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      To Do
                    </p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                      {columns.find((col) => col.id === "pending")?.tasks
                        .length || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-400 text-lg">
                      📝
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      In Progress
                    </p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                      {columns.find((col) => col.id === "in_progress")?.tasks
                        .length || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/50 rounded-lg flex items-center justify-center">
                    <span className="text-amber-600 dark:text-amber-400 text-lg">
                      ⚡
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Completed
                    </p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                      {columns.find((col) => col.id === "completed")?.tasks
                        .length || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg flex items-center justify-center">
                    <span className="text-emerald-600 dark:text-emerald-400 text-lg">
                      ✅
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Add Task Form */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <form className="flex gap-4">
                <div className="flex-1">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Add a new task..."
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 focus:border-transparent bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 transition-all duration-200"
                    aria-label="Task title"
                  />
                </div>
                <button
                  className="px-6 py-3 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2"
                  onClick={addTask}
                  type="button"
                >
                  <span className="text-lg">+</span>
                  Add Task
                </button>
              </form>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="text-red-500 text-lg">⚠️</span>
                <p className="text-red-700 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}

          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-6 overflow-x-auto pb-8">
              {columns.map((column) => {
                return (
                  <DroppableColumn
                    key={column.id}
                    column={column}
                    onDelete={deleteTask}
                    onEdit={startEditTask}
                    generatingSummary={generatingSummary}
                  />
                );
              })}
            </div>

            {typeof window !== "undefined"
              ? createPortal(
                  <DragOverlay>
                    {activeTask ? (
                      <div className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg p-4 shadow-lg rotate-2">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {activeTask.title}
                        </div>
                        {activeTask.description && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            {activeTask.description}
                          </p>
                        )}
                      </div>
                    ) : null}
                  </DragOverlay>,
                  document.body,
                )
              : null}
          </DndContext>
        </div>
      </div>
    );
  }

  // List View (modern design)
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
            <div className="space-y-2">
              <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                Task Management
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Organize and track your tasks with AI-powered insights
              </p>
            </div>

            {/* View Toggle Buttons */}
            <div className="flex bg-white dark:bg-slate-800 rounded-xl p-1 shadow-sm border border-slate-200 dark:border-slate-700">
              <button
                className="px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                onClick={() => setViewMode("list")}
              >
                List View
              </button>
              <button
                className="px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                onClick={() => setViewMode("board")}
              >
                Board View
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    To Do
                  </p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                    {columns.find((col) => col.id === "pending")?.tasks
                      .length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 text-lg">
                    📝
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    In Progress
                  </p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                    {columns.find((col) => col.id === "in_progress")?.tasks
                      .length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/50 rounded-lg flex items-center justify-center">
                  <span className="text-amber-600 dark:text-amber-400 text-lg">
                    ⚡
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Completed
                  </p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                    {columns.find((col) => col.id === "completed")?.tasks
                      .length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg flex items-center justify-center">
                  <span className="text-emerald-600 dark:text-emerald-400 text-lg">
                    ✅
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Add Task Form */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <form className="flex gap-4">
              <div className="flex-1">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Add a new task..."
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 focus:border-transparent bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 transition-all duration-200"
                  aria-label="Task title"
                />
              </div>
              <button
                className="px-6 py-3 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2"
                onClick={addTask}
                type="button"
              >
                <span className="text-lg">+</span>
                Add Task
              </button>
            </form>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-red-500 text-lg">⚠️</span>
              <p className="text-red-700 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Tasks List */}
        <div className="space-y-4">
          {tasks.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-16 text-center shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="text-6xl mb-6 opacity-50">📭</div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                No tasks yet
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                Create your first task to get started
              </p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task._id}
                className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={task.status === "completed"}
                      onChange={(e) =>
                        updateTaskStatus(
                          task._id,
                          e.target.checked ? "completed" : "pending",
                        )
                      }
                      className="w-5 h-5 text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-slate-900 dark:focus:ring-slate-100 focus:ring-2 transition-all duration-200"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {editingTaskId === task._id ? (
                          <div className="space-y-3">
                            <input
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200"
                              placeholder="Task title..."
                            />
                            <textarea
                              value={editingDescription}
                              onChange={(e) =>
                                setEditingDescription(e.target.value)
                              }
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200 resize-none"
                              placeholder="Task description (optional)..."
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <button
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all duration-200"
                                onClick={saveEditTask}
                              >
                                Save
                              </button>
                              <button
                                className="px-3 py-1 bg-slate-500 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-all duration-200"
                                onClick={cancelEditTask}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <h3
                              className={`font-semibold text-lg mb-2 ${
                                task.status === "completed"
                                  ? "line-through text-slate-500 dark:text-slate-400"
                                  : "text-slate-900 dark:text-white"
                              }`}
                            >
                              {task.title}
                            </h3>
                            {task.description && (
                              <p className="text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
                                {task.description}
                              </p>
                            )}
                          </>
                        )}
                        {task.dueAt && (
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-slate-500 dark:text-slate-400 text-sm">
                              📅
                            </span>
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              Due{" "}
                              {new Date(task.dueAt).toLocaleDateString(
                                "en-US",
                                {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                },
                              )}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Status Badge */}
                        <span
                          className={`px-3 py-1 rounded-md text-sm font-medium ${
                            task.status === "pending"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200"
                              : task.status === "in_progress"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                          }`}
                        >
                          {task.status === "pending" && "To Do"}
                          {task.status === "in_progress" && "In Progress"}
                          {task.status === "completed" && "Done"}
                        </span>

                        <button
                          className="p-2 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                          onClick={() => startEditTask(task)}
                          title="Edit task"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>

                        <button
                          className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                          onClick={() => deleteTask(task._id)}
                          title="Delete task"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* AI Summary for completed tasks */}
                    {task.status === "completed" && (
                      <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                        {generatingSummary === task._id ? (
                          <div className="flex items-center gap-3">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-600 border-t-transparent"></div>
                            <span className="text-emerald-700 dark:text-emerald-300 text-sm font-medium">
                              Generating AI summary...
                            </span>
                          </div>
                        ) : task.aiSummary ? (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-emerald-600 dark:text-emerald-400">
                                🤖
                              </span>
                              <span className="text-emerald-800 dark:text-emerald-200 text-sm font-semibold">
                                AI Summary
                              </span>
                            </div>
                            <p className="text-emerald-800 dark:text-emerald-200 text-sm leading-relaxed">
                              {task.aiSummary}
                            </p>
                          </div>
                        ) : (
                          <button
                            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 underline text-sm font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.dispatchEvent(
                                new CustomEvent("generate-summary", {
                                  detail: task._id,
                                }),
                              );
                            }}
                          >
                            ✨ Generate AI Summary
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function DroppableColumn({
  column,
  onDelete,
  onEdit,
  generatingSummary,
}: {
  column: Column;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  generatingSummary: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-80 transition-all duration-200 ${
        isOver ? "ring-2 ring-blue-500 ring-opacity-50" : ""
      }`}
    >
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 min-h-96 flex flex-col overflow-hidden">
        {/* Column Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  column.id === "pending"
                    ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400"
                    : column.id === "in_progress"
                      ? "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400"
                      : "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400"
                }`}
              >
                <span className="text-sm">
                  {column.id === "pending" && "📝"}
                  {column.id === "in_progress" && "⚡"}
                  {column.id === "completed" && "✅"}
                </span>
              </div>
              {column.title}
            </h3>
            <span
              className={`px-2 py-1 rounded-md text-xs font-medium ${
                column.id === "pending"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200"
                  : column.id === "in_progress"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
              }`}
            >
              {column.tasks.length}
            </span>
          </div>
        </div>

        {/* Tasks List */}
        <div className="p-4 flex-1">
          <SortableContext
            items={column.tasks.map((t) => t._id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {column.tasks.map((task) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  generatingSummary={generatingSummary}
                />
              ))}
              {column.tasks.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-slate-400 dark:text-slate-500">
                    <svg
                      className="w-8 h-8 mx-auto mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    <p className="text-sm">No tasks yet</p>
                    <p className="text-xs mt-1">Drop tasks here</p>
                  </div>
                </div>
              )}
            </div>
          </SortableContext>
        </div>
      </div>
    </div>
  );
}

function TaskCard({
  task,
  onDelete,
  onEdit,
  generatingSummary,
}: {
  task: Task;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  generatingSummary: string | null;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-50 rotate-2 shadow-lg" : ""
      } ${task.status === "completed" ? "opacity-75" : ""}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h4
            className={`font-medium text-slate-900 dark:text-white mb-2 ${
              task.status === "completed"
                ? "line-through text-slate-500 dark:text-slate-400"
                : ""
            }`}
          >
            {task.title}
          </h4>
          {task.description && (
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-3">
              {task.description}
            </p>
          )}
          {task.dueAt && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 text-xs">
                📅
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-400">
                {new Date(task.dueAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-1 ml-2">
          <button
            className="p-1.5 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
            title="Edit task"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task._id);
            }}
            title="Delete task"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <span
          className={`px-2.5 py-1 rounded-md text-xs font-medium ${
            task.status === "pending"
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200"
              : task.status === "in_progress"
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
          }`}
        >
          {task.status === "pending" && "To Do"}
          {task.status === "in_progress" && "In Progress"}
          {task.status === "completed" && "Done"}
        </span>
      </div>

      <AnimatePresence>
        {task.status === "completed" && (
          <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
            {generatingSummary === task._id ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-emerald-600 border-t-transparent"></div>
                <span className="text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                  Generating AI summary...
                </span>
              </div>
            ) : task.aiSummary ? (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-emerald-600 dark:text-emerald-400 text-xs">
                    🤖
                  </span>
                  <span className="text-emerald-800 dark:text-emerald-200 text-xs font-semibold">
                    AI Summary
                  </span>
                </div>
                <p className="text-emerald-800 dark:text-emerald-200 text-xs leading-relaxed">
                  {task.aiSummary}
                </p>
              </div>
            ) : (
              <button
                className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 underline text-xs font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                  window.dispatchEvent(
                    new CustomEvent("generate-summary", { detail: task._id }),
                  );
                }}
              >
                ✨ Generate AI Summary
              </button>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
